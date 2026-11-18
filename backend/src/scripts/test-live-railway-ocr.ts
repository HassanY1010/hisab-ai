import fs from 'fs';
import path from 'path';

async function testLiveRailwayOcr() {
  console.log('--- Testing Live Railway OCR Endpoint (/api/ocr/upload) ---');
  const targetImage = path.resolve('../sample-data/bank-notifications/1794975470868.jpg');
  if (!fs.existsSync(targetImage)) {
    throw new Error('Target image not found: ' + targetImage);
  }

  const fileBytes = fs.readFileSync(targetImage);
  const blob = new Blob([fileBytes], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('image', blob, '1794975470868.jpg');
  formData.append('commit', 'false'); // Isolated test: does NOT register or create duplicate transactions

  console.log('Sending multipart POST to https://hisab-ai-production.up.railway.app/api/ocr/upload ...');
  const startTime = Date.now();
  
  const res = await fetch('https://hisab-ai-production.up.railway.app/api/ocr/upload', {
    method: 'POST',
    body: formData
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Response HTTP Status: ${res.status} ${res.statusText} (${duration}s)`);

  const json = await res.json();
  console.log('Live Server OCR Response Data:');
  console.log(JSON.stringify(json, null, 2));

  if (json.success && json.data?.ocr) {
    const ocr = json.data.ocr;
    console.log('\n--- VERIFICATION OF EXTRACTED FIELDS FROM PRODUCTION ---');
    console.log('Transaction Number :', ocr.transactionNumber, ocr.transactionNumber === '20302390920' ? '✅ PASS' : '❌ FAIL');
    console.log('Amount             :', ocr.amount, ocr.amount === 5000000 ? '✅ PASS' : '❌ FAIL');
    console.log('Beneficiary Name   :', ocr.beneficiaryName, ocr.beneficiaryName?.includes('عمار ابراهيم') ? '✅ PASS' : '❌ FAIL');
    console.log('Raw Date Str       :', ocr.rawDateStr);
    console.log('Raw Time Str       :', ocr.rawTimeStr);
    console.log('Status             :', ocr.status);
    console.log('Registration       :', json.data.registration, '(Isolated / null as expected)');
  }
}

testLiveRailwayOcr().catch(console.error);
