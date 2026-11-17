import path from 'path';
import fs from 'fs';
import { TesseractOcrAdapter } from '../services/ocr/tesseract-adapter';
import { BankakReceiptParser } from '../services/ocr/bankak-receipt-parser';

async function main() {
  const samplesDir = path.resolve(__dirname, '../../../sample-data/bank-notifications');
  const files = fs.readdirSync(samplesDir)
    .filter(f => !f.startsWith('preprocessed_') && (f.endsWith('.jpg') || f.endsWith('.png')))
    .sort();

  console.log(`Found ${files.length} sample files:`, files);
  const adapter = new TesseractOcrAdapter();

  for (const file of files) {
    const fullPath = path.join(samplesDir, file);
    console.log(`\n========================================`);
    console.log(`Processing: ${file}`);
    const { text, confidence } = await adapter.extractText(fullPath);
    console.log(`--- RAW TEXT ---`);
    console.log(text);
    console.log(`--- PARSED ---`);
    const parsed = BankakReceiptParser.parse(text);
    console.log({
      txNumber: parsed.transactionNumber,
      amount: parsed.amount,
      beneficiaryName: parsed.beneficiaryName,
      senderAccount: parsed.senderAccount,
      receiverAccount: parsed.receiverAccount,
      date: parsed.formattedDate,
      time: parsed.formattedTime
    });
  }
}

main().catch(console.error);
