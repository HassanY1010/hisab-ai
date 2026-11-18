import { ParsedBankakReceipt } from './ocr-types';
import { ReceiptDateParser } from './receipt-date-parser';

export class BankakReceiptParser {
  /**
   * Normalizes transaction number:
   * Strips spaces, dashes, hidden unicode characters (LTR/RTL markers)
   */
  public static normalizeTxNumber(raw: string): string {
    return raw.replace(/[\u200E\u200F\u202A-\u202E]/g, '')
              .replace(/[^a-zA-Z0-9]/g, '')
              .trim()
              .toUpperCase();
  }

  /**
   * Normalizes amount string into a float number:
   * Handles commas, spaces, dot thousands separators, and decimal points.
   * e.g. "1,000,000.00" -> 1000000.0
   * e.g. "1.943.000.00" -> 1943000.0
   * e.g. "2,000,000" -> 2000000.0
   * e.g. "200.000" -> 200000.0 (prevents parseFloat treating .000 as decimal .0)
   * e.g. "500,000" -> 500000.0
   */
  public static parseAmount(raw: string): number | null {
    if (!raw) return null;
    let s = raw.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
    s = s.replace(/[^\d.,]/g, '').trim();
    if (!s) return null;

    // Ending with 2-digit decimal e.g. .00 or ,00
    if (/[.,]\d{2}$/.test(s)) {
      const intPart = s.slice(0, -3).replace(/[.,]/g, '');
      const decPart = s.slice(-2);
      const val = parseFloat(intPart + '.' + decPart);
      if (!isNaN(val) && val >= 100) {
        return val;
      }
    }

    // No decimals, all separators are thousands (e.g. 200.000, 2,000,000, 500,000)
    const intOnly = s.replace(/[.,]/g, '');
    const val = parseFloat(intOnly);
    if (!isNaN(val) && val >= 100) {
      return val;
    }

    return null;
  }

  /**
   * Parses raw OCR text into a structured Bankak receipt object
   */
  public static parse(rawText: string, engineName: string = 'Tesseract.js', engineVersion: string = '5.1.0'): ParsedBankakReceipt {
    const lines = rawText.split('\n').map(l => l.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim()).filter(Boolean);

    let transactionNumber: string | null = null;
    let amount: number | null = null;
    let amountRaw: string | null = null;
    let transactionDate: Date | null = null;
    let senderAccount: string | null = null;
    let receiverAccount: string | null = null;
    let beneficiaryName: string | null = null;

      // 1. Transaction Number Extraction
    let txConfidence = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/رقم\s*العملية/i.test(line) || /العملية/i.test(line)) {
        let match = line.match(/\b((?:20|21)\d{8,10}|\d{10,12})\b/);
        if (match) {
          transactionNumber = match[1];
          txConfidence = 0.99;
          break;
        }
        if (i + 1 < lines.length) {
          const nextMatch = lines[i + 1].match(/\b((?:20|21)\d{8,10}|\d{10,12})\b/);
          if (nextMatch) {
            transactionNumber = nextMatch[1];
            txConfidence = 0.95;
            break;
          }
        }
        if (i > 0) {
          const prevMatch = lines[i - 1].match(/\b((?:20|21)\d{8,10}|\d{10,12})\b/);
          if (prevMatch) {
            transactionNumber = prevMatch[1];
            txConfidence = 0.95;
            break;
          }
        }
      }
    }

    // Fallback: 11-digit number starting with 20 or 21 anywhere in text
    if (!transactionNumber) {
      const fallbackMatch = rawText.match(/\b((?:20|21)\d{9})\b/);
      if (fallbackMatch) {
        transactionNumber = fallbackMatch[1];
        txConfidence = 0.90;
      }
    }

    // 2. Amount Extraction
    let amountConfidence = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/المبلغ/i.test(line)) {
        // Greedily match amount string (digits, commas, and decimals)
        const match = line.match(/([\d.,\s]*\d|\d+)/);
        if (match) {
          const p = this.parseAmount(match[1]);
          if (p && p >= 100) {
            amountRaw = match[1];
            amount = p;
            amountConfidence = 0.99;
            break;
          }
        }
        if (i + 1 < lines.length) {
          const nextMatch = lines[i + 1].match(/([\d.,\s]*\d|\d+)/);
          if (nextMatch) {
            const p = this.parseAmount(nextMatch[1]);
            if (p && p >= 100) {
              amountRaw = nextMatch[1];
              amount = p;
              amountConfidence = 0.95;
              break;
            }
          }
        }
        if (i > 0) {
          const prevMatch = lines[i - 1].match(/([\d.,\s]*\d|\d+)/);
          if (prevMatch) {
            const p = this.parseAmount(prevMatch[1]);
            if (p && p >= 100) {
              amountRaw = prevMatch[1];
              amount = p;
              amountConfidence = 0.95;
              break;
            }
          }
        }
      }
    }

    // Fallback: search for numbers with thousands commas or decimal points
    if (amount === null) {
      const fallbackMatches = [...rawText.matchAll(/([\d][\d.,]{3,}\d)/g)];
      for (const m of fallbackMatches) {
        const s = m[1].replace(/[^\d]/g, '');
        if (s === transactionNumber || s.length === 11 || s.length >= 15) continue;
        const parsed = this.parseAmount(m[1]);
        if (parsed && parsed >= 1000 && parsed <= 500000000) {
          amount = parsed;
          amountRaw = m[1];
          amountConfidence = 0.75;
          break;
        }
      }
    }

    // 3. Date & Time Extraction via robust ReceiptDateParser
    const parsedDateTime = ReceiptDateParser.parse(rawText);
    transactionDate = parsedDateTime.date;

    // 4. Accounts extraction
    for (const line of lines) {
      if (/من\s*حساب/i.test(line)) {
        const match = line.match(/((?:\d{1,4}\s*){3,4})/);
        if (match) senderAccount = match[1].trim();
      } else if (/الى\s*حساب|إلى\s*حساب/i.test(line)) {
        const match = line.match(/((?:\d{1,4}\s*){3,4})/);
        if (match) receiverAccount = match[1].trim();
      }
    }

    if (!senderAccount || !receiverAccount) {
      const accountMatches = [...rawText.matchAll(/(\d{1,4}\s+\d{4}\s+\d{4}\s+\d{4})/g)];
      if (!senderAccount && accountMatches.length >= 1) {
        senderAccount = accountMatches[0][1].trim();
      }
      if (!receiverAccount && accountMatches.length >= 2) {
        receiverAccount = accountMatches[1][1].trim();
      }
    }

    // 5. Beneficiary / Sender / Client Name extraction
    // Comprehensive prefix regex supporting all Bankak labels and OCR variants (e.g. 5 لمرسل, إسم المر, إسم المستفيد, إسم المرسل إليه)
    const prefixRegex = /^(?:[\d\W_]*)(?:(?:إ?سم|اسم|لسم|أسم)\s*)?(?:المرسل|لمرسل|مرسل|المر|المستفيد|لمستفيد|مستفيد|المحول|لمحول|محول|الطرف\s*المستلم|الطرف\s*الآخر|العميل|الحساب)(?:\s*(?:إ?ليه|اليه|له))?[:\s|\-]*/i;

    const isNonName = (val: string) => {
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
    };

    const cleanName = (str: string) => {
      return str.replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Strategy 1: Comprehensive keyword extraction
    let nameConfidence = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Ignore footer UI buttons
      if (/إضافة\s*مستفيد|اضافة\s*مستفيد/i.test(line)) continue;

      if (prefixRegex.test(line) || /المرسل|المستفيد/i.test(line)) {
        const stripped = line.replace(prefixRegex, '').trim();
        const cleaned = cleanName(stripped);
        if (cleaned.length >= 3 && !isNonName(cleaned)) {
          beneficiaryName = cleaned;
          nameConfidence = 0.95;
          break;
        }
        // Check previous line in case value preceded label
        if (i > 0) {
          const prev = cleanName(lines[i - 1]);
          if (prev.length >= 3 && !isNonName(prev)) {
            beneficiaryName = prev;
            nameConfidence = 0.90;
            break;
          }
        }
        // Check following 1-2 lines in case label and name are on separate lines
        for (let j = 1; j <= 2 && i + j < lines.length; j++) {
          if (/إضافة\s*مستفيد|اضافة\s*مستفيد/i.test(lines[i + j])) continue;
          const next = cleanName(lines[i + j]);
          if (next.length >= 3 && !isNonName(next)) {
            beneficiaryName = next;
            nameConfidence = 0.90;
            break;
          }
        }
      }
      if (beneficiaryName) break;
    }

    // Strategy 2: Positional contextual extraction (standard Bankak receipt slot between 'الى حساب' and 'الموبايل'/'التعليق'/'المبلغ')
    if (!beneficiaryName) {
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
          const candidate = cleanName(stripped);
          if (candidate.length >= 3 && !isNonName(candidate) && candidate.split(' ').length >= 2) {
            beneficiaryName = candidate;
            nameConfidence = 0.90;
            break;
          }
        }
      }
    }

    const normalizedTxNumber = transactionNumber ? this.normalizeTxNumber(transactionNumber) : null;

    let confidence = 0.0;
    if (normalizedTxNumber && amount !== null && parsedDateTime.hasDate) {
      confidence = 0.99;
    } else if (normalizedTxNumber && amount !== null) {
      confidence = 0.90;
    } else if (normalizedTxNumber || amount !== null) {
      confidence = 0.50;
    }

    let status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED' = 'FAILED';
    if (normalizedTxNumber && amount !== null && amount >= 1000 && parsedDateTime.hasDate && txConfidence >= 0.8 && amountConfidence >= 0.8) {
      status = 'SUCCESS';
    } else if (normalizedTxNumber || (amount !== null && amount > 0)) {
      status = 'NEEDS_REVIEW';
    }

    return {
      transactionNumber,
      normalizedTxNumber,
      amount,
      amountRaw,
      currency: 'SDG',
      transactionDate,
      rawDateStr: parsedDateTime.rawDateStr,
      rawTimeStr: parsedDateTime.rawTimeStr,
      rawDateTimeStr: parsedDateTime.rawDateTimeStr,
      formattedDate: parsedDateTime.formattedDate,
      formattedTime: parsedDateTime.formattedTime,
      formattedDateTime: parsedDateTime.formattedDateTime,
      hasTime: parsedDateTime.hasTime,
      hasDate: parsedDateTime.hasDate,
      senderAccount,
      receiverAccount,
      beneficiaryName,
      confidence,
      txConfidence,
      amountConfidence,
      nameConfidence,
      status,
      rawText,
      engine: engineName,
      engineVersion
    };
  }
}
