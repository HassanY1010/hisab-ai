import path from 'path';
import { TesseractOcrAdapter } from '../services/ocr/tesseract-adapter';

async function main() {
  const file = path.resolve('../sample-data/bank-notifications/1794975470829.jpg');
  const adapter = TesseractOcrAdapter.getInstance();
  const res = await adapter.parseReceipt(file);
  console.log('Result for 1794975470829.jpg:');
  console.log('Tx:', res.transactionNumber);
  console.log('Amount:', res.amount);
  console.log('Beneficiary:', res.beneficiaryName);
  console.log('rawDateStr:', res.rawDateStr);
  console.log('rawTimeStr:', res.rawTimeStr);
  console.log('formattedDate:', res.formattedDate);
  console.log('hasDate:', res.hasDate);
  console.log('status:', res.status);
  await adapter.terminate();
}

main().catch(console.error);
