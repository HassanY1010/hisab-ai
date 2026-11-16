import path from 'path';
import fs from 'fs';
import { TesseractOcrAdapter } from '../services/ocr/tesseract-adapter';

// Ground truth verified visually from the 6 authentic Bankak screenshots:
const GROUND_TRUTH: Record<string, { expectedAmount: number; expectedTxId: string; expectedDateStr: string }> = {
  '1794831071578.jpg': {
    expectedAmount: 1000000.0,
    expectedTxId: '20188179228',
    expectedDateStr: '16-Nov-2026 00:06:50'
  },
  '1794831071609.jpg': {
    expectedAmount: 5000000.0,
    expectedTxId: '20038176728',
    expectedDateStr: '16-Nov-2026 00:02:31'
  },
  '1794831071639.jpg': {
    expectedAmount: 1800000.0,
    expectedTxId: '20026330498',
    expectedDateStr: '15-Nov-2026 15:00:23'
  },
  '1794831071669.jpg': {
    expectedAmount: 2000000.0,
    expectedTxId: '20288096608',
    expectedDateStr: '16-Nov-2026 00:02:41'
  },
  '1794831071700.jpg': {
    expectedAmount: 1943000.0,
    expectedTxId: '20425437680',
    expectedDateStr: '16-Nov-2026 13:41:11'
  },
  '1794831071730.jpg': {
    expectedAmount: 1500000.0,
    expectedTxId: '20375262495',
    expectedDateStr: '15-Nov-2026 13:15:54'
  }
};

async function run() {
  const samplesDir = path.resolve(__dirname, '../../../sample-data/bank-notifications');
  const files = Object.keys(GROUND_TRUTH);
  const adapter = new TesseractOcrAdapter();

  console.log(`Starting OCR Evaluation on ${files.length} real sample images...`);

  interface ResultRow {
    fileName: string;
    expectedAmount: number;
    extractedAmount: number | null;
    expectedTxId: string;
    extractedTxId: string | null;
    status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
    amountMatch: boolean;
    txIdMatch: boolean;
    rawTextExcerpt: string;
  }

  const results: ResultRow[] = [];

  for (const file of files) {
    const fullPath = path.join(samplesDir, file);
    const truth = GROUND_TRUTH[file];

    console.log(`\nProcessing: ${file}...`);
    try {
      const parsed = await adapter.parseReceipt(fullPath);
      const amountMatch = parsed.amount === truth.expectedAmount;
      const txIdMatch = parsed.normalizedTxNumber === truth.expectedTxId;

      let status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW' = 'FAIL';
      if (amountMatch && txIdMatch) {
        status = 'PASS';
      } else if (amountMatch || txIdMatch) {
        status = 'NEEDS_REVIEW';
      }

      results.push({
        fileName: file,
        expectedAmount: truth.expectedAmount,
        extractedAmount: parsed.amount,
        expectedTxId: truth.expectedTxId,
        extractedTxId: parsed.normalizedTxNumber,
        status,
        amountMatch,
        txIdMatch,
        rawTextExcerpt: parsed.rawText.replace(/\n+/g, ' | ').slice(0, 100)
      });

      console.log(` -> Result: ${status} [Amount: ${parsed.amount} vs ${truth.expectedAmount}, TxID: ${parsed.normalizedTxNumber} vs ${truth.expectedTxId}]`);
    } catch (err: any) {
      console.error(`Error processing ${file}:`, err);
      results.push({
        fileName: file,
        expectedAmount: truth.expectedAmount,
        extractedAmount: null,
        expectedTxId: truth.expectedTxId,
        extractedTxId: null,
        status: 'FAIL',
        amountMatch: false,
        txIdMatch: false,
        rawTextExcerpt: err.message
      });
    }
  }

  await adapter.terminate();

  // Calculate statistics
  const total = results.length;
  const passCount = results.filter(r => r.status === 'PASS').length;
  const amountPassCount = results.filter(r => r.amountMatch).length;
  const txIdPassCount = results.filter(r => r.txIdMatch).length;
  const needsReviewCount = results.filter(r => r.status === 'NEEDS_REVIEW').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  const amountAccuracy = ((amountPassCount / total) * 100).toFixed(1);
  const txIdAccuracy = ((txIdPassCount / total) * 100).toFixed(1);
  const overallPassRate = ((passCount / total) * 100).toFixed(1);

  console.log('\n================ OCR TEST RESULTS SUMMARY ================');
  console.log(`Total Samples Tested: ${total}`);
  console.log(`Full PASS: ${passCount} / ${total} (${overallPassRate}%)`);
  console.log(`Amount Accuracy: ${amountPassCount} / ${total} (${amountAccuracy}%)`);
  console.log(`Transaction ID Accuracy: ${txIdPassCount} / ${total} (${txIdAccuracy}%)`);
  console.log(`Needs Review: ${needsReviewCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('==========================================================\n');

  // Format Markdown Report
  const markdownRows = results.map(r => {
    const fmtExpectedAmt = r.expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 });
    const fmtExtractedAmt = r.extractedAmount !== null ? r.extractedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'N/A';
    return `| \`${r.fileName}\` | ${fmtExpectedAmt} SDG | ${fmtExtractedAmt} SDG | \`${r.expectedTxId}\` | \`${r.extractedTxId || 'N/A'}\` | **${r.status}** |`;
  }).join('\n');

  const reportContent = `# تقرير اختبار وفحص صور إشعارات البنك الحقيقية (OCR Real Samples Report)
**نظام HISAB AI | بنك الخرطوم (تطبيق بنكك - Bankak)**

تاريخ الفحص والاختبار: ${new Date().toISOString().split('T')[0]}  
المحرك المستخدم: **Tesseract.js OCR v5.1 + Sharp Image Preprocessing Pipeline**  
نوع المعالجة المسبقة: Grayscale + Negate (عكس الألوان إلى نص داكن على خلفية فاتحة) + Contrast Normalization + Sharpening

---

## 1. ملخص نتائج الاختبار

| المقياس | النتيجة |
|---|---|
| إجمالي الصور المفحوصة | **${total} صور حقيقية** |
| نجاح الاستخراج الكامل (PASS) | **${passCount} / ${total} (${overallPassRate}%)** |
| دقة استخراج المبالغ المالية | **${amountPassCount} / ${total} (${amountAccuracy}%)** |
| دقة استخراج أرقام العمليات (TxID) | **${txIdPassCount} / ${total} (${txIdAccuracy}%)** |
| عمليات تحتاج مراجعة (NEEDS_REVIEW) | **${needsReviewCount}** |
| حالات الفشل الكامل (FAIL) | **${failCount}** |

---

## 2. جدول المقارنة التفصيلي (Expected vs Extracted)

| الصورة | المبلغ المتوقع | المبلغ المستخرج | رقم العملية المتوقع | رقم العملية المستخرج | النتيجة |
|---|---|---|---|---|---|
${markdownRows}

---

## 3. التحليل الهندسي لبنية إشعار البنك (Bankak)

1. **صيغة الصور وأبعادها:**
   - 5 صور بدقة $736 \\times 1600$ بكسل بنسبة أبعاد قياسية للهواتف الذكية.
   - صورة واحدة بدقة $592 \\times 1280$ بنفس النسبة العرضية للارتفاع (~0.46).
   - جودة الصور واضحة ومتباينة وألوان الخلفية متدرجة باللون الأخضر المميز لتطبيق بنكك.

2. **توزيع المعلومات والحقول:**
   - جدول منظم بخطوط بيضاء منحنية الزوايا.
   - العمود الأيمن يحتوي على العناوين النصية باللغة العربية: \`رقم العملية\`، \`التاريخ و الزمن\`، \`من حساب\`، \`الى حساب\`، \`إسم المرسل اليه\`، \`المبلغ\`.
   - العمود الأيسر يحتوي على القيم الفعلية.

3. **سلوك كتابة الأرقام:**
   - رقم العملية: 11 رقماً متواصلاً يبدأ بالرقم \`20\`.
   - المبلغ المالي: يُكتب بفواصل آلاف ونقطة عشرية بصيغة \`X,XXX,XXX.00\`.
   - أرقام الحسابات: 16 رقماً مقسمة في 4 مجموعات رباعية \`0143 0252 0392 0001\`.

4. **المعالجة المسبقة بواسطة Sharp:**
   - نظراً لأن النصوص مكتوبة باللون الأبيض فوق خلفية خضراء متدرجة، فإن تطبيق \`.negate()\` جعل النصوص داكنة على خلفية بيضاء نقية، مما رفع دقة محرك Tesseract إلى أقصى كفاءة.
`;

  const reportPath = path.resolve(__dirname, '../../../OCR_REAL_SAMPLES_REPORT.md');
  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`Generated report saved to: ${reportPath}`);
}

run().catch(console.error);
