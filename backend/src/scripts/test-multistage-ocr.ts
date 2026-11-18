import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { createWorker, PSM } from 'tesseract.js';

export interface FieldConfidences {
  txConfidence: number;
  amountConfidence: number;
  nameConfidence: number;
}

export interface AdvancedOcrResult {
  file: string;
  txNumber: string | null;
  amount: number | null;
  amountRaw: string | null;
  dateStr: string | null;
  timeStr: string | null;
  beneficiaryName: string | null;
  senderAccount: string | null;
  receiverAccount: string | null;
  confidences: FieldConfidences;
  status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED';
  overallConfidence: number;
  rawText: string;
}

export class BankakAmountParser {
  public static parse(raw: string | null | undefined): { amount: number | null; rawMatched: string | null; confidence: number } {
    if (!raw) return { amount: null, rawMatched: null, confidence: 0 };
    let s = raw.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
    s = s.replace(/[^\d.,]/g, '').trim();
    if (!s) return { amount: null, rawMatched: null, confidence: 0 };

    // Ending with 2-digit decimal e.g. .00 or ,00
    if (/[.,]\d{2}$/.test(s)) {
      const intPart = s.slice(0, -3).replace(/[.,]/g, '');
      const decPart = s.slice(-2);
      const val = parseFloat(intPart + '.' + decPart);
      if (!isNaN(val) && val >= 100) {
        return { amount: val, rawMatched: s, confidence: 0.99 };
      }
    }

    // No decimals, all separators are thousands (e.g. 200.000, 2,000,000, 500,000)
    const intOnly = s.replace(/[.,]/g, '');
    const val = parseFloat(intOnly);
    if (!isNaN(val) && val >= 100) {
      return { amount: val, rawMatched: s, confidence: 0.90 };
    }

    return { amount: null, rawMatched: s, confidence: 0 };
  }
}

export class MultiStageBankakExtractor {
  public static cleanArabicName(str: string): string {
    return str.replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  public static isNoiseName(val: string): boolean {
    const v = val.trim().toLowerCase();
    if (
      v.length <= 2 ||
      /^\d+$/.test(v) ||
      /^(n\/?a|لا\s*يوجد|غير\s*متوفر|null|undefined)$/i.test(v) ||
      /^(إ?ليه|اليه|له)$/i.test(v) ||
      /^(تحويل|تحويلات|رقم|العملية|التاريخ|الزمن|من|الى|إلى|حساب|المبلغ|التعليق|الموبايل|إضافة|اضافة|مستفيد|بنك|الخرطوم|مشاركة|طباعة|تحميل|موافق)/i.test(v) ||
      /(مرة\s*اخرى|اضافة\s*مستفيد|إضافة\s*مستفيد)/i.test(v)
    ) {
      return true;
    }
    const words = v.split(/\s+/).filter(Boolean);
    if (words.length < 2) return true;
    if (words.includes('اسم') || words.includes('إسم') || words.includes('المرسل') || words.includes('المستفيد')) return true;
    const avgLen = words.reduce((acc, w) => acc + w.length, 0) / words.length;
    if (avgLen < 3.2) return true;
    return false;
  }

  public static parseAll(text: string): {
    tx: string | null;
    txConfidence: number;
    amount: number | null;
    amountRaw: string | null;
    amountConfidence: number;
    name: string | null;
    nameConfidence: number;
    senderAccount: string | null;
    receiverAccount: string | null;
    dateStr: string | null;
    timeStr: string | null;
  } {
    const lines = text.split('\n').map(l => l.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim()).filter(Boolean);

    // 1. Transaction Number
    let tx: string | null = null;
    let txConfidence = 0;
    const txRegex = /\b((?:20|21)\d{9})\b/;
    const broadTxRegex = /\b((?:20|21)\d{8,10}|\d{11,12})\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/رقم\s*العملية|العملية/i.test(line)) {
        let m = line.match(txRegex) || line.match(broadTxRegex);
        if (m) { tx = m[1]; txConfidence = 0.99; break; }
        if (i > 0) {
          m = lines[i - 1].match(txRegex) || lines[i - 1].match(broadTxRegex);
          if (m) { tx = m[1]; txConfidence = 0.95; break; }
        }
        if (i + 1 < lines.length) {
          m = lines[i + 1].match(txRegex) || lines[i + 1].match(broadTxRegex);
          if (m) { tx = m[1]; txConfidence = 0.95; break; }
        }
      }
    }
    if (!tx) {
      const fb = text.match(txRegex);
      if (fb) { tx = fb[1]; txConfidence = 0.90; }
    }

    // 2. Amount
    let amount: number | null = null;
    let amountRaw: string | null = null;
    let amountConfidence = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/المبلغ/i.test(line)) {
        const clean = line.replace(/.*المبلغ[:\s]*/i, '').trim();
        const m = clean.match(/([\d][\d.,\s]*\d|\d+)/);
        if (m) {
          const parsed = BankakAmountParser.parse(m[1]);
          if (parsed.amount) {
            amount = parsed.amount;
            amountRaw = m[1];
            amountConfidence = parsed.confidence;
            break;
          }
        }
        if (i + 1 < lines.length) {
          const nextClean = lines[i + 1].trim();
          const nm = nextClean.match(/([\d][\d.,\s]*\d|\d+)/);
          if (nm) {
            const parsed = BankakAmountParser.parse(nm[1]);
            if (parsed.amount) {
              amount = parsed.amount;
              amountRaw = nm[1];
              amountConfidence = parsed.confidence;
              break;
            }
          }
        }
        if (i > 0) {
          const prevClean = lines[i - 1].trim();
          const pm = prevClean.match(/([\d][\d.,\s]*\d|\d+)/);
          if (pm) {
            const parsed = BankakAmountParser.parse(pm[1]);
            if (parsed.amount) {
              amount = parsed.amount;
              amountRaw = pm[1];
              amountConfidence = parsed.confidence;
              break;
            }
          }
        }
      }
    }

    // Fallback search for large numbers with decimal .00 or ,00
    if (amount === null) {
      const allMatches = [...text.matchAll(/([\d][\d.,]{3,}\d)/g)];
      for (const m of allMatches) {
        // Exclude if it looks like transaction number or account number
        const s = m[1].replace(/[^\d]/g, '');
        if (s === tx || s.length === 11 || s.length >= 15) continue;
        const parsed = BankakAmountParser.parse(m[1]);
        if (parsed.amount && parsed.amount >= 1000 && parsed.amount <= 500000000) {
          amount = parsed.amount;
          amountRaw = m[1];
          amountConfidence = 0.75;
          break;
        }
      }
    }

    // 3. Beneficiary Name
    let name: string | null = null;
    let nameConfidence = 0;
    const prefixRegex = /^(?:[\d\W_]*)(?:(?:إ?سم|اسم|لسم|أسم)\s*)?(?:المرسل|لمرسل|مرسل|المر|المستفيد|لمستفيد|مستفيد|المحول|لمحول|محول|الطرف\s*المستلم|الطرف\s*الآخر|العميل|الحساب)(?:\s*(?:إ?ليه|اليه|له))?[:\s|\-]*/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/إضافة\s*مستفيد|اضافة\s*مستفيد/i.test(line)) continue;

      if (prefixRegex.test(line) || /المرسل|المستفيد/i.test(line)) {
        // Same line
        const stripped = line.replace(prefixRegex, '').trim();
        const cleaned = this.cleanArabicName(stripped);
        if (cleaned.length >= 3 && !this.isNoiseName(cleaned)) {
          name = cleaned;
          nameConfidence = 0.95;
          break;
        }
        // Previous line
        if (i > 0) {
          const prev = this.cleanArabicName(lines[i - 1]);
          if (prev.length >= 3 && !this.isNoiseName(prev)) {
            name = prev;
            nameConfidence = 0.90;
            break;
          }
        }
        // Next lines
        for (let j = 1; j <= 2 && i + j < lines.length; j++) {
          if (/إضافة\s*مستفيد|اضافة\s*مستفيد/i.test(lines[i + j])) continue;
          const next = this.cleanArabicName(lines[i + j]);
          if (next.length >= 3 && !this.isNoiseName(next)) {
            name = next;
            nameConfidence = 0.90;
            break;
          }
        }
      }
      if (name) break;
    }

    // Strategy 2: Positional contextual extraction (standard Bankak receipt slot between 'الى حساب' and 'الموبايل'/'التعليق'/'المبلغ')
    if (!name) {
      let toAccountIdx = -1;
      let mobileOrAmountIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/الى\s*حساب|إلى\s*حساب/i.test(lines[i])) toAccountIdx = i;
        if (toAccountIdx !== -1 && i > toAccountIdx && /الموبايل|التعليق|المبلغ/i.test(lines[i])) {
          mobileOrAmountIdx = i;
          break;
        }
      }

      if (toAccountIdx !== -1 && mobileOrAmountIdx !== -1) {
        for (let k = toAccountIdx + 1; k < mobileOrAmountIdx; k++) {
          if (/إضافة\s*مستفيد|اضافة\s*مستفيد/i.test(lines[k])) continue;
          const stripped = lines[k].replace(prefixRegex, '').trim();
          const candidate = this.cleanArabicName(stripped);
          if (candidate.length >= 3 && !this.isNoiseName(candidate) && candidate.split(' ').length >= 2) {
            name = candidate;
            nameConfidence = 0.90;
            break;
          }
        }
      }
    }

    // 4. Accounts & Dates
    let senderAccount: string | null = null;
    let receiverAccount: string | null = null;
    for (const l of lines) {
      if (/من\s*حساب/i.test(l)) {
        const m = l.match(/((?:\d{1,4}\s*){3,4})/);
        if (m) senderAccount = m[1].trim();
      } else if (/الى\s*حساب|إلى\s*حساب/i.test(l)) {
        const m = l.match(/((?:\d{1,4}\s*){3,4})/);
        if (m) receiverAccount = m[1].trim();
      }
    }

    // Date & Time
    let dateStr: string | null = null;
    let timeStr: string | null = null;
    const dateMatch = text.match(/(\d{1,2}-[A-Za-z]{3}-\d{4})/);
    if (dateMatch) dateStr = dateMatch[1];
    const timeMatch = text.match(/(\d{1,2}:\d{2}:\d{2})/);
    if (timeMatch) timeStr = timeMatch[1];

    return {
      tx,
      txConfidence,
      amount,
      amountRaw,
      amountConfidence,
      name,
      nameConfidence,
      senderAccount,
      receiverAccount,
      dateStr,
      timeStr
    };
  }
}

async function runAudit() {
  const dir = fs.existsSync(path.resolve('sample-data/bank-notifications'))
    ? path.resolve('sample-data/bank-notifications')
    : path.resolve(__dirname, '../../../sample-data/bank-notifications');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
  console.log(`Starting Advanced Multi-Stage OCR Evaluation on ${files.length} authentic Bankak receipts...\n`);

  const worker = await createWorker('ara+eng');

  const results: AdvancedOcrResult[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const meta = await sharp(fullPath).metadata();

    // 1. Auto-Orientation
    let s = sharp(fullPath);
    if (meta.width && meta.height && meta.width > meta.height) {
      s = s.rotate(90);
    }

    // 2. High-Fidelity Preprocessing: Normalize contrast, denoise & sharpen
    const preppedBuf = await s.grayscale().negate().normalize().sharpen().toBuffer();

    // 3. Stage 1 OCR Pass: Sparse Key-Value segmentation (PSM 11)
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const psm11Res = await worker.recognize(preppedBuf);
    let parsed = MultiStageBankakExtractor.parseAll(psm11Res.data.text);

    // 4. Stage 2 Fallback Pass: If Amount or Tx missing, run targeted Zonal crops
    if (!parsed.amount || !parsed.tx) {
      const H = meta.height || 1000;
      const W = meta.width || 500;
      // Crop lower half for amount
      if (!parsed.amount) {
        try {
          const amtCrop = await sharp(fullPath)
            .extract({ left: 0, top: Math.round(H * 0.55), width: W, height: Math.round(H * 0.15) })
            .resize({ width: W * 2 })
            .grayscale()
            .negate()
            .normalize()
            .sharpen()
            .toBuffer();
          const amtRes = await worker.recognize(amtCrop);
          const amtParsed = MultiStageBankakExtractor.parseAll(amtRes.data.text);
          if (amtParsed.amount) {
            parsed.amount = amtParsed.amount;
            parsed.amountRaw = amtParsed.amountRaw;
            parsed.amountConfidence = amtParsed.amountConfidence;
          } else {
            const matches = [...amtRes.data.text.matchAll(/([\d][\d.,\s]*\d|\d+)/g)];
            for (const m of matches) {
              const p = BankakAmountParser.parse(m[1]);
              if (p.amount && p.amount >= 1000) {
                parsed.amount = p.amount;
                parsed.amountRaw = p.rawMatched;
                parsed.amountConfidence = 0.95;
                break;
              }
            }
          }
        } catch {}
      }

      // Crop upper half for Tx ID
      if (!parsed.tx) {
        try {
          const txCrop = await sharp(fullPath)
            .extract({ left: 0, top: Math.round(H * 0.20), width: W, height: Math.round(H * 0.20) })
            .resize({ width: W * 2 })
            .grayscale()
            .negate()
            .normalize()
            .sharpen()
            .toBuffer();
          const txRes = await worker.recognize(txCrop);
          const txParsed = MultiStageBankakExtractor.parseAll(txRes.data.text);
          if (txParsed.tx) {
            parsed.tx = txParsed.tx;
            parsed.txConfidence = txParsed.txConfidence;
          }
        } catch {}
      }
    }

    // 5. Final Status & Confidence Evaluation
    const overallConf = Number(((parsed.txConfidence * 0.4 + parsed.amountConfidence * 0.4 + parsed.nameConfidence * 0.2)).toFixed(2));
    let status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED' = 'FAILED';
    if (parsed.tx && parsed.amount && parsed.amount >= 1000 && parsed.txConfidence >= 0.8 && parsed.amountConfidence >= 0.8) {
      status = 'SUCCESS';
    } else if (parsed.tx || parsed.amount) {
      status = 'NEEDS_REVIEW';
    }

    results.push({
      file,
      txNumber: parsed.tx,
      amount: parsed.amount,
      amountRaw: parsed.amountRaw,
      dateStr: parsed.dateStr,
      timeStr: parsed.timeStr,
      beneficiaryName: parsed.name,
      senderAccount: parsed.senderAccount,
      receiverAccount: parsed.receiverAccount,
      confidences: {
        txConfidence: parsed.txConfidence,
        amountConfidence: parsed.amountConfidence,
        nameConfidence: parsed.nameConfidence
      },
      status,
      overallConfidence: overallConf,
      rawText: psm11Res.data.text
    });

    console.log(`[${file}] Status: ${status} | Tx: ${parsed.tx || 'N/A'} (${(parsed.txConfidence*100).toFixed(0)}%) | Amount: ${parsed.amount?.toLocaleString('en-US') || 'N/A'} (${(parsed.amountConfidence*100).toFixed(0)}%) | Name: ${parsed.name || '«غير متوفر»'} (${(parsed.nameConfidence*100).toFixed(0)}%)`);
  }

  await worker.terminate();

  console.log('\n============================================================');
  console.log('                 AUDIT SUMMARY REPORT                       ');
  console.log('============================================================');
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const reviewCount = results.filter(r => r.status === 'NEEDS_REVIEW').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  const totalVerifiedAmount = results.filter(r => r.status === 'SUCCESS').reduce((acc, r) => acc + (r.amount || 0), 0);

  console.log(`Total Receipts Processed: ${results.length}`);
  console.log(`Verified SUCCESS: ${successCount} (${((successCount/results.length)*100).toFixed(1)}%)`);
  console.log(`NEEDS_REVIEW: ${reviewCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log(`Total Verified Financial Amount: ${totalVerifiedAmount.toLocaleString('en-US')} SDG`);

  // Target reference check: 1794975470868.jpg
  const targetReceipt = results.find(r => r.file === '1794975470868.jpg');
  console.log('\n--- TARGET REFERENCE RECEIPT (1794975470868.jpg) CHECK ---');
  console.log('Target Tx (expected 20302390920):', targetReceipt?.txNumber, targetReceipt?.txNumber === '20302390920' ? '✅ PASS' : '❌ FAIL');
  console.log('Target Name (expected عمار ابراهيم...):', targetReceipt?.beneficiaryName, targetReceipt?.beneficiaryName?.includes('عمار') ? '✅ PASS' : '❌ FAIL');
  console.log('Target Amount (expected 5,000,000):', targetReceipt?.amount, targetReceipt?.amount === 5000000 ? '✅ PASS' : '❌ FAIL');
  console.log('Target Date (expected 17-Nov-2026):', targetReceipt?.dateStr, targetReceipt?.dateStr === '17-Nov-2026' ? '✅ PASS' : '❌ FAIL');
  console.log('Target Time (expected 19:26:31):', targetReceipt?.timeStr, targetReceipt?.timeStr === '19:26:31' ? '✅ PASS' : '❌ FAIL');
}

runAudit().catch(console.error);
