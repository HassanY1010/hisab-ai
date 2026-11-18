export interface ParsedBankakReceipt {
  transactionNumber: string | null;
  normalizedTxNumber: string | null;
  amount: number | null;
  amountRaw: string | null;
  currency: string;
  transactionDate: Date | null;
  rawDateStr?: string | null;
  rawTimeStr?: string | null;
  rawDateTimeStr?: string | null;
  formattedDate?: string | null;
  formattedTime?: string | null;
  formattedDateTime?: string | null;
  hasTime?: boolean;
  hasDate?: boolean;
  senderAccount: string | null;
  receiverAccount: string | null;
  beneficiaryName: string | null;
  confidence: number;
  txConfidence?: number;
  amountConfidence?: number;
  nameConfidence?: number;
  status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED';
  rawText: string;
  engine: string;
  engineVersion: string;
}

export interface IOcrEngine {
  name: string;
  version: string;
  extractText(imagePath: string): Promise<{ text: string; confidence: number; preprocessedImagePath?: string }>;
  parseReceipt(imagePath: string): Promise<ParsedBankakReceipt>;
}
