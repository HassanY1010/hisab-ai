import path from 'path';
import { TesseractOcrAdapter } from '../services/ocr/tesseract-adapter';

async function test717and753() {
  const adapter = TesseractOcrAdapter.getInstance();
  for (const f of ['1794975470717.jpg', '1794975470753.jpg']) {
    const file = path.resolve('../sample-data/bank-notifications', f);
    const res = await adapter.parseReceipt(file);
    console.log(`\n=== ${f} ===`);
    console.log('Tx:', res.transactionNumber);
    console.log('Amount:', res.amount);
    console.log('Beneficiary:', res.beneficiaryName);
    console.log('Date:', res.formattedDate, '| rawDateStr:', res.rawDateStr);
    console.log('Time:', res.formattedTime, '| rawTimeStr:', res.rawTimeStr);
    console.log('Status:', res.status);
  }
  await adapter.terminate();
}

test717and753().catch(console.error);
