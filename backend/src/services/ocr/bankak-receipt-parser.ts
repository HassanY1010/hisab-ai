import { ParsedBankakReceipt } from './ocr-types';

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
   * Handles commas, spaces, and decimal points.
   * e.g. "1,000,000.00" -> 1000000.0
   * e.g. "1943,000.00" -> 1943000.0
   * e.g. "500,000" -> 500000.0
   */
  public static parseAmount(raw: string): number | null {
    if (!raw) return null;
    const cleanStr = raw.replace(/[\u200E\u200F\u202A-\u202E]/g, '')
                        .replace(/[^\d.,]/g, '')
                        .trim();
    if (!cleanStr) return null;

    let normalized = cleanStr;
    if (normalized.includes(',') && normalized.includes('.')) {
      normalized = normalized.replace(/,/g, '');
    } else if (normalized.includes(',')) {
      const parts = normalized.split(',');
      if (parts.length > 1 && parts[parts.length - 1].length === 3) {
        normalized = normalized.replace(/,/g, '');
      } else if (parts.length === 2 && parts[1].length <= 2) {
        normalized = normalized.replace(',', '.');
      } else {
        normalized = normalized.replace(/,/g, '');
      }
    }

    const val = parseFloat(normalized);
    return isNaN(val) ? null : val;
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
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/رقم\s*العملية/i.test(line) || /العملية/i.test(line)) {
        const match = line.match(/\b(20\d{8,10}|\d{10,12})\b/);
        if (match) {
          transactionNumber = match[1];
          break;
        }
        if (i + 1 < lines.length) {
          const nextMatch = lines[i + 1].match(/\b(20\d{8,10}|\d{10,12})\b/);
          if (nextMatch) {
            transactionNumber = nextMatch[1];
            break;
          }
        }
      }
    }

    // Fallback: 11-digit number starting with 20 anywhere in text
    if (!transactionNumber) {
      const fallbackMatch = rawText.match(/\b(20\d{9})\b/);
      if (fallbackMatch) {
        transactionNumber = fallbackMatch[1];
      }
    }

    // 2. Amount Extraction
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/المبلغ/i.test(line)) {
        // Greedily match amount string (digits, commas, and decimals)
        const match = line.match(/([\d,]+(?:\.\d+)?)/);
        if (match) {
          amountRaw = match[1];
          amount = this.parseAmount(amountRaw);
          break;
        }
        if (i + 1 < lines.length) {
          const nextMatch = lines[i + 1].match(/([\d,]+(?:\.\d+)?)/);
          if (nextMatch) {
            amountRaw = nextMatch[1];
            amount = this.parseAmount(amountRaw);
            break;
          }
        }
      }
    }

    // Fallback: search for numbers with thousands commas or decimal points
    if (amount === null) {
      const fallbackMatches = [...rawText.matchAll(/([\d,]+(?:\.\d{2})?)/g)];
      for (const m of fallbackMatches) {
        const parsed = this.parseAmount(m[1]);
        if (parsed && parsed >= 1000) {
          amount = parsed;
          amountRaw = m[1];
          break;
        }
      }
    }

    // 3. Date & Time Extraction
    const dateMatch = rawText.match(/(\d{1,2}-[A-Za-z]{3}-\d{4}(?:\s+\d{2}:\d{2}:\d{2})?)/i) ||
                      rawText.match(/(\d{2}:\d{2}:\d{2}\s+\d{1,2}-[A-Za-z]{3}-\d{4})/i);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        transactionDate = parsedDate;
      }
    }

    // 4. Accounts extraction
    const accountMatches = [...rawText.matchAll(/(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/g)];
    if (accountMatches.length >= 1) {
      senderAccount = accountMatches[0][1];
    }
    if (accountMatches.length >= 2) {
      receiverAccount = accountMatches[1][1];
    }

    // 5. Beneficiary Name extraction
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/إسم\s*المرسل\s*اليه|المرسل\s*اليه/i.test(line)) {
        const cleaned = line.replace(/إسم\s*المرسل\s*اليه|المرسل\s*اليه/i, '').trim();
        if (cleaned.length > 2 && !/^\d+$/.test(cleaned)) {
          beneficiaryName = cleaned;
        } else if (i + 1 < lines.length && !/^\d+$/.test(lines[i + 1])) {
          beneficiaryName = lines[i + 1];
        }
      }
    }

    const normalizedTxNumber = transactionNumber ? this.normalizeTxNumber(transactionNumber) : null;

    let confidence = 0.0;
    if (normalizedTxNumber && amount !== null) {
      confidence = 0.98;
    } else if (normalizedTxNumber || amount !== null) {
      confidence = 0.50;
    }

    let status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED' = 'FAILED';
    if (normalizedTxNumber && amount !== null && amount > 0) {
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
      senderAccount,
      receiverAccount,
      beneficiaryName,
      confidence,
      status,
      rawText,
      engine: engineName,
      engineVersion
    };
  }
}
