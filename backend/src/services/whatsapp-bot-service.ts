import { prisma } from './db';
import { TransactionService } from './transaction-service';
import { BatchService } from './batch-service';
import { TesseractOcrAdapter } from './ocr/tesseract-adapter';
import { SupabaseStorageService } from './storage/supabase-storage';
import fs from 'fs';

export class WhatsAppBotService {
  private static ocrAdapter = new TesseractOcrAdapter();

  /**
   * Initializes default conversation channels (Inward and Outward)
   */
  public static async initDefaultConversations() {
    try {
      const inward = await prisma.conversation.findFirst({ where: { direction: 'INWARD' } });
      if (!inward) {
        await prisma.conversation.create({
          data: {
            name: 'قناة إشعارات الوارد (تحويلات العملاء المستلمة)',
            direction: 'INWARD'
          }
        });
      }

      const outward = await prisma.conversation.findFirst({ where: { direction: 'OUTWARD' } });
      if (!outward) {
        await prisma.conversation.create({
          data: {
            name: 'قناة إشعارات الصادر (تحويلات الموردين والمصدرين)',
            direction: 'OUTWARD'
          }
        });
      }
    } catch (err: any) {
      console.warn('[WhatsApp] Init default conversations skipped/failed:', err.message);
    }
  }

  /**
   * Processes an incoming text or image message from the WhatsApp simulation
   */
  public static async processMessage(
    conversationId: string,
    text: string,
    imagePath?: string,
    imageBuffer?: Buffer,
    originalFilename?: string
  ): Promise<{ userMessage: any; botResponse: any }> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new Error('المحادثة غير موجودة');

    let mediaUrl = imagePath;
    let storageKey: string | undefined = undefined;

    // Upload to Supabase Storage if image provided
    if (imagePath && fs.existsSync(imagePath)) {
      const buffer = imageBuffer || fs.readFileSync(imagePath);
      const filename = originalFilename || 'receipt.jpg';
      const uploadRes = await SupabaseStorageService.uploadReceipt(buffer, filename);
      mediaUrl = uploadRes.url;
      storageKey = uploadRes.storageKey;
    }

    // 1. Save incoming user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        sender: 'USER',
        text: text || (mediaUrl ? '📷 [صورة إشعار تحويل بنكي]' : ''),
        mediaUrl,
        storageKey
      }
    });

    let botReplyText = '';
    let linkedTxId: string | undefined = undefined;

    // 2. If an image receipt is attached, run OCR and processing
    if (imagePath && fs.existsSync(imagePath)) {
      try {
        const parsed = await this.ocrAdapter.parseReceipt(imagePath);

        if (!parsed.normalizedTxNumber || parsed.amount === null || parsed.amount <= 0) {
          botReplyText = `⚠️ تعذر استخراج بيانات الإشعار بدقة عالية.\n\n` +
            `▫️ رقم العملية المقروء: ${parsed.normalizedTxNumber || 'غير واضح'}\n` +
            `▫️ المبلغ المقروء: ${parsed.amount ? parsed.amount.toLocaleString() + ' SDG' : 'غير واضح'}\n\n` +
            `يرجى إعادة إرسال صورة أوضح، أو مراجعة الإشعار في قسم «يحتاج مراجعة» للمطابقة اليدوية.`;
        } else {
          const regResult = await TransactionService.registerTransaction({
            transactionNumber: parsed.normalizedTxNumber,
            amount: parsed.amount,
            direction: conversation.direction as 'INWARD' | 'OUTWARD',
            senderAccount: parsed.senderAccount || undefined,
            receiverAccount: parsed.receiverAccount || undefined,
            beneficiaryName: parsed.beneficiaryName || undefined,
            transactionDate: parsed.transactionDate || undefined,
            imagePath: mediaUrl,
            storageKey,
            extractedText: parsed.rawText,
            rawOcrJson: JSON.stringify(parsed),
            ocrStatus: parsed.status,
            verificationStatus: 'VERIFIED'
          });

          if (regResult.status === 'DUPLICATE') {
            const orig = regResult.duplicateDetails?.originalTransaction;
            const isMismatch = regResult.duplicateDetails?.amountMismatch;
            const origAmount = orig ? Number(orig.amount) : 0;
            botReplyText = `🚨 *تنبيه تكرار عملية بنكية!*\n\n` +
              `❌ رقم العملية: *${parsed.normalizedTxNumber}* سبق تسجيلها في النظام.\n` +
              `▫️ تاريخ التسجيل الأصلي: ${orig ? new Date(orig.createdAt).toLocaleString('ar-EG') : '-'}\n` +
              `▫️ المبلغ الأصلي: *${origAmount.toLocaleString()} SDG*\n` +
              `▫️ المبلغ المحاول: *${parsed.amount.toLocaleString()} SDG*\n` +
              (isMismatch ? `⚠️ *تحذير:* المبلغ المحاول يختلف عن المبلغ المسجل مسبقاً!\n` : '') +
              `\n⛔ *القرار المحاسبي:* تم رفض العملية وحجبها من الإجماليات.\n` +
              `📋 تم تقييد المحاولة في سجل الرقابة وكشف التكرار.`;
            linkedTxId = orig?.id;
          } else if (regResult.status === 'SUCCESS') {
            const stats = await TransactionService.getFinancialStats();
            const dirLabel = conversation.direction === 'INWARD' ? 'وارد (مستلم)' : 'صادر (مدفوع)';
            botReplyText = `✅ *تم اعتماد وتسجيل الإشعار البنكي بنجاح!*\n\n` +
              `▫️ رقم العملية: *${parsed.normalizedTxNumber}*\n` +
              `▫️ المبلغ: *${parsed.amount.toLocaleString()} SDG*\n` +
              `▫️ نوع العملية: *${dirLabel}*\n` +
              (parsed.beneficiaryName ? `▫️ المستفيد: ${parsed.beneficiaryName}\n` : '') +
              (parsed.transactionDate ? `▫️ تاريخ الإشعار: ${new Date(parsed.transactionDate).toLocaleString('ar-EG')}\n` : '') +
              `\n📊 *الموقف المالي المحدث:*\n` +
              `• إجمالي الوارد: ${stats.totalInward.toLocaleString()} SDG\n` +
              `• إجمالي الصادر: ${stats.totalOutward.toLocaleString()} SDG\n` +
              `• صافي الرصيد: ${stats.netBalance.toLocaleString()} SDG`;
            linkedTxId = regResult.transaction?.id;
          } else {
            botReplyText = `❌ فشل التسجيل: ${regResult.message}`;
          }
        }
      } catch (err: any) {
        botReplyText = `❌ حدث خطأ أثناء معالجة صورة الإشعار: ${err.message}`;
      }
    } else {
      // 3. Process Text Commands
      botReplyText = await this.handleTextCommand(text.trim(), conversation.direction as 'INWARD' | 'OUTWARD');
    }

    // 4. Save Bot Reply
    const botResponse = await prisma.chatMessage.create({
      data: {
        conversationId,
        sender: 'BOT',
        text: botReplyText,
        transactionId: linkedTxId
      }
    });

    return { userMessage, botResponse };
  }

  /**
   * Command parser for Arabic financial bot instructions
   */
  private static async handleTextCommand(cmd: string, currentDirection: 'INWARD' | 'OUTWARD'): Promise<string> {
    const cleanCmd = cmd.trim();

    if (/^(الإجمالي|اجمالي|الرصيد)$/i.test(cleanCmd)) {
      const stats = await TransactionService.getFinancialStats();
      return `📊 *ملخص الموقف المالي العام:*\n\n` +
        `🟢 إجمالي الوارد: *${stats.totalInward.toLocaleString()} SDG* (${stats.countInward} عملية)\n` +
        `🔴 إجمالي الصادر: *${stats.totalOutward.toLocaleString()} SDG* (${stats.countOutward} عملية)\n` +
        `⚖️ صافي الفرق: *${stats.netBalance.toLocaleString()} SDG*\n\n` +
        `📁 السير المفتوحة: ${stats.openBatchesCount}\n` +
        `🛡️ العمليات المكررة المحجوبة: ${stats.duplicateCount}`;
    }

    if (/^(إجمالي الوارد|اجمالي الوارد|الوارد)$/i.test(cleanCmd)) {
      const stats = await TransactionService.getFinancialStats();
      return `🟢 *إجمالي التحويلات الواردة:*\n\n` +
        `المبلغ الإجمالي: *${stats.totalInward.toLocaleString()} SDG*\n` +
        `عدد العمليات: *${stats.countInward}* عملية واردة معتمدة.`;
    }

    if (/^(إجمالي الصادر|اجمالي الصادر|الصادر)$/i.test(cleanCmd)) {
      const stats = await TransactionService.getFinancialStats();
      return `🔴 *إجمالي التحويلات الصادرة:*\n\n` +
        `المبلغ الإجمالي: *${stats.totalOutward.toLocaleString()} SDG*\n` +
        `عدد العمليات: *${stats.countOutward}* عملية صادرة معتمدة.`;
    }

    if (/^(عدد العمليات|العمليات)$/i.test(cleanCmd)) {
      const stats = await TransactionService.getFinancialStats();
      return `🔢 *إحصائيات عدد العمليات:*\n\n` +
        `• إجمالي العمليات المسجلة: *${stats.totalTransactions}*\n` +
        `• عمليات الوارد: *${stats.countInward}*\n` +
        `• عمليات الصادر: *${stats.countOutward}*\n` +
        `• عمليات تحتاج مراجعة: *${stats.pendingReviewCount}*\n` +
        `• محاولات التكرار المحجوبة: *${stats.duplicateCount}*`;
    }

    if (/^(تقرير اليوم|عمليات اليوم)$/i.test(cleanCmd)) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const txs = await prisma.transaction.findMany({
        where: { receivedAt: { gte: startOfDay } },
        orderBy: { receivedAt: 'desc' }
      });

      const totalIn = txs.filter(t => t.direction === 'INWARD').reduce((acc, t) => acc + Number(t.amount), 0);
      const totalOut = txs.filter(t => t.direction === 'OUTWARD').reduce((acc, t) => acc + Number(t.amount), 0);

      return `📅 *تقرير حركة اليوم (${startOfDay.toLocaleDateString('ar-EG')}):*\n\n` +
        `• عدد العمليات اليوم: ${txs.length}\n` +
        `• وارد اليوم: *${totalIn.toLocaleString()} SDG*\n` +
        `• صادر اليوم: *${totalOut.toLocaleString()} SDG*\n` +
        `• صافي اليوم: *${(totalIn - totalOut).toLocaleString()} SDG*`;
    }

    if (/^(تقرير الأسبوع|تقرير الاسبوع)$/i.test(cleanCmd)) {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      const txs = await prisma.transaction.findMany({
        where: { receivedAt: { gte: startOfWeek } }
      });

      const totalIn = txs.filter(t => t.direction === 'INWARD').reduce((acc, t) => acc + Number(t.amount), 0);
      const totalOut = txs.filter(t => t.direction === 'OUTWARD').reduce((acc, t) => acc + Number(t.amount), 0);

      return `📈 *تقرير حركة آخر 7 أيام:*\n\n` +
        `• إجمالي العمليات: ${txs.length}\n` +
        `• إجمالي الوارد: *${totalIn.toLocaleString()} SDG*\n` +
        `• إجمالي الصادر: *${totalOut.toLocaleString()} SDG*\n` +
        `• صافي الحركة: *${(totalIn - totalOut).toLocaleString()} SDG*`;
    }

    if (/^(تقرير الشهر)$/i.test(cleanCmd)) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const txs = await prisma.transaction.findMany({
        where: { receivedAt: { gte: startOfMonth } }
      });

      const totalIn = txs.filter(t => t.direction === 'INWARD').reduce((acc, t) => acc + Number(t.amount), 0);
      const totalOut = txs.filter(t => t.direction === 'OUTWARD').reduce((acc, t) => acc + Number(t.amount), 0);

      return `🗓️ *تقرير الشهر الحالي:*\n\n` +
        `• إجمالي العمليات: ${txs.length}\n` +
        `• إجمالي الوارد: *${totalIn.toLocaleString()} SDG*\n` +
        `• إجمالي الصادر: *${totalOut.toLocaleString()} SDG*\n` +
        `• صافي الشهر: *${(totalIn - totalOut).toLocaleString()} SDG*`;
    }

    if (/^(آخر العمليات|اخر العمليات)$/i.test(cleanCmd)) {
      const recent = await prisma.transaction.findMany({
        take: 5,
        orderBy: { receivedAt: 'desc' }
      });

      if (recent.length === 0) {
        return 'لا توجد عمليات مسجلة حتى الآن.';
      }

      const list = recent.map((t, idx) => {
        const symbol = t.direction === 'INWARD' ? '🟢 وارد' : '🔴 صادر';
        const numAmt = Number(t.amount);
        return `${idx + 1}. ${symbol} | *${numAmt.toLocaleString()} SDG*\n   رقم العملية: \`${t.transactionNumber}\`\n   الوقت: ${new Date(t.receivedAt).toLocaleTimeString('ar-EG')}`;
      }).join('\n\n');

      return `⏱️ *آخر 5 عمليات مسجلة:*\n\n${list}`;
    }

    if (/^(كشف التكرار|التكرار)$/i.test(cleanCmd)) {
      const duplicates = await prisma.duplicateAttempt.findMany({
        take: 5,
        orderBy: { attemptedAt: 'desc' },
        include: { originalTransaction: true }
      });

      if (duplicates.length === 0) {
        return '🛡️ سجل كشف التكرار: لا توجد أي محاولات تكرار محجوبة حتى الآن. جميع العمليات فريدة ومؤمنة.';
      }

      const list = duplicates.map((d, i) => {
        const extAmt = d.extractedAmount ? Number(d.extractedAmount) : null;
        return `${i + 1}. رقم العملية: \`${d.transactionNumber}\`\n   المبلغ المحاول: ${extAmt ? extAmt.toLocaleString() + ' SDG' : '-'}\n   وقت المحاولة: ${new Date(d.attemptedAt).toLocaleString('ar-EG')}\n   حالة الرفض: محجوبة ومستبعدة من الإجمالي 🚫`;
      }).join('\n\n');

      return `🛡️ *سجل كشف التكرار (آخر المحاولات المحجوبة):*\n\n${list}`;
    }

    if (cleanCmd.startsWith('إنشاء سير') || cleanCmd.startsWith('انشاء سير')) {
      const parts = cleanCmd.split(/\s+/);
      const batchName = parts.slice(2).join(' ') || `سير ${new Date().toLocaleTimeString('ar-EG')}`;
      const batch = await BatchService.createBatch(batchName, currentDirection, 'تم إنشاؤه عبر بوت واتساب');
      return `📁 تم إنشاء سير جديد بنجاح!\n\n` +
        `▫️ الاسم: *${batch.name}*\n` +
        `▫️ النوع: *${batch.direction === 'INWARD' ? 'وارد' : 'صادر'}*\n` +
        `▫️ الحالة: مفتوح (OPEN)\n` +
        `▫️ المعرف: \`${batch.id}\``;
    }

    if (cleanCmd.startsWith('تفاصيل السير')) {
      const parts = cleanCmd.split(/\s+/);
      const term = parts.slice(2).join(' ');
      const batches = await BatchService.listBatches();
      const match = batches.find(b => b.name.includes(term) || b.id === term);

      if (!match) {
        return `❌ لم يتم العثور على سير بهذا الاسم: "${term}"`;
      }

      return `📁 *تفاصيل السير: ${match.name}*\n\n` +
        `▫️ النوع: ${match.direction === 'INWARD' ? 'وارد' : 'صادر'}\n` +
        `▫️ الحالة: ${match.status === 'OPEN' ? 'مفتوح 🟢' : 'مغلق 🔒'}\n` +
        `▫️ عدد العمليات: ${match.transactionCount}\n` +
        `▫️ إجمالي المبلغ: *${match.totalAmount.toLocaleString()} SDG*`;
    }

    if (/^(تصدير excel|تصدير اكسل|اكسل)$/i.test(cleanCmd)) {
      return `📊 *تصدير كشف الحساب Excel:*\n\n` +
        `يمكنك تحميل ملف Excel المنسق مباشرة عبر الرابط التالي أو من قسم التقارير:\n` +
        `📎 [رابط تنزيل التقرير](/api/reports/excel)`;
    }

    // Default Help
    return `🤖 *أهلاً بك في نظام المحاسبة الذكي (HISAB AI)*\n\n` +
      `يمكنك إرسال صورة إشعار تحويل بنكي مباشرة ليتم قراءتها واحتسابها، أو استخدام الأوامر التالية:\n\n` +
      `• *الإجمالي* : الموقف المالي العام (الوارد والصادر والصافي)\n` +
      `• *إجمالي الوارد* : ملخص التحويلات الواردة\n` +
      `• *إجمالي الصادر* : ملخص التحويلات الصادرة\n` +
      `• *عدد العمليات* : تفصيل إحصائي لأعداد العمليات\n` +
      `• *تقرير اليوم* : حركة تعاملات اليوم\n` +
      `• *تقرير الأسبوع* : ملخص تعاملات آخر 7 أيام\n` +
      `• *تقرير الشهر* : ملخص تعاملات الشهر\n` +
      `• *آخر العمليات* : عرض آخر العمليات المسجلة\n` +
      `• *كشف التكرار* : عرض العمليات المكررة المحجوبة\n` +
      `• *إنشاء سير [الاسم]* : إنشاء سير مالي جديد\n` +
      `• *تفاصيل السير [الاسم]* : عرض تفاصيل وإجمالي السير\n` +
      `• *تصدير Excel* : استخراج ملف Excel فوري`;
  }
}
