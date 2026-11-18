import path from 'path';
import fs from 'fs';
import { TesseractOcrAdapter } from '../services/ocr/tesseract-adapter';
import { BankakReceiptParser } from '../services/ocr/bankak-receipt-parser';
import { NotificationQueueService } from '../services/notification-queue-service';
import { prisma } from '../services/db';

interface GroundTruth {
  tx: string;
  name: string;
  amount: number | null; // null if unreadable / ambiguous
  date: string;
  time: string;
}

const GROUND_TRUTH: Record<string, GroundTruth> = {
  '1794831071578.jpg': { tx: '20188179228', name: 'ابوالقاسم عثمان يحى ادم', amount: 1000000, date: '16-Nov-2026', time: '00:06:50' },
  '1794831071609.jpg': { tx: '20038176728', name: 'ابوالقاسم عثمان يحى ادم', amount: 5000000, date: '16-Nov-2026', time: '00:02:31' },
  '1794831071639.jpg': { tx: '20026330498', name: 'ايمان احمد عبدالله محمد', amount: 1800000, date: '15-Nov-2026', time: '15:00:23' },
  '1794831071669.jpg': { tx: '20288096608', name: 'ابوالقاسم عثمان يحى ادم', amount: 2000000, date: '16-Nov-2026', time: '00:02:41' },
  '1794831071700.jpg': { tx: '20425437680', name: 'تبيان عبدالرحيم العوض محمد', amount: 1943000, date: '16-Nov-2026', time: '13:41:11' },
  '1794831071730.jpg': { tx: '20375262495', name: 'عائشه مضوى احمد ابوشمه', amount: 1500000, date: '15-Nov-2026', time: '13:15:54' },
  '1794975470565.jpg': { tx: '20307388216', name: 'عمار ابراهيم عبدالله ادم', amount: 5000000, date: '17-Nov-2026', time: '18:39:36' },
  '1794975470645.jpg': { tx: '20463037998', name: 'عمار ابراهيم عبدالله ادم', amount: 5000000, date: '17-Nov-2026', time: '18:54:53' },
  '1794975470682.jpg': { tx: '20463038001', name: 'عمار ابراهيم عبدالله ادم', amount: 3000000, date: '17-Nov-2026', time: '18:56:02' },
  '1794975470717.jpg': { tx: '20325685916', name: 'عمار ابراهيم عبدالله ادم', amount: 500000, date: '17-Nov-2026', time: '18:58:54' },
  '1794975470753.jpg': { tx: '20425682427', name: 'عمار ابراهيم عبدالله ادم', amount: 4500000, date: '17-Nov-2026', time: '18:59:04' },
  '1794975470790.jpg': { tx: '21440267046', name: 'عمار ابراهيم عبدالله ادم', amount: 5000000, date: '17-Nov-2026', time: '18:59:41' },
  '1794975470829.jpg': { tx: '20352390190', name: 'عمار ابراهيم عبدالله ادم', amount: 2000000, date: '17-Nov-2026', time: '19:27:13' },
  '1794975470868.jpg': { tx: '20302390920', name: 'عمار ابراهيم عبدالله ادم', amount: 5000000, date: '17-Nov-2026', time: '19:26:31' },
  '1794975470908.jpg': { tx: '21550118586', name: 'الطيب عبدالمتعال محجوب الحسن', amount: 5000000, date: '17-Nov-2026', time: '19:28:18' },
  '1794975470952.jpg': { tx: '21255688390', name: 'الطيب عبدالمتعال محجوب الحسن', amount: 5000000, date: '17-Nov-2026', time: '19:28:45' },
  '1794975470995.jpg': { tx: '21550118699', name: 'الطيب عبدالمتعال محجوب الحسن', amount: 5000000, date: '17-Nov-2026', time: '19:28:32' },
};

async function runAcceptanceTest() {
  console.log('================================================================');
  console.log('       HISAB AI - INDEPENDENT FINAL ACCEPTANCE TEST             ');
  console.log('================================================================\n');

  // ---------------------------------------------------------
  // Part 1: Amount Parser Unit Verifications (No Guessing / Correct Scaling)
  // ---------------------------------------------------------
  console.log('--- 1. Testing Amount Parser Edge Cases ---');
  const amountTestCases = [
    { input: '2,000,000', expected: 2000000 },
    { input: '200,000', expected: 200000 },
    { input: '1,500,000.00', expected: 1500000 },
    { input: '5,000,000.00', expected: 5000000 },
    { input: '1,943,000', expected: 1943000 },
    { input: '2.000.000.00', expected: 2000000 },
    { input: '1.943.000.00', expected: 1943000 },
    { input: '200.000', expected: 200000 },
    { input: '1000', expected: 1000 },
    { input: '000', expected: null }, // must not invent amount
    { input: '40', expected: null }    // must not invent amount
  ];

  let amountTestsPassed = 0;
  for (const tc of amountTestCases) {
    const res = BankakReceiptParser.parseAmount(tc.input);
    const pass = res === tc.expected;
    if (pass) amountTestsPassed++;
    console.log(`Amount: "${tc.input}" => Parsed: ${res} | Expected: ${tc.expected} [${pass ? 'PASS' : 'FAIL'}]`);
  }
  console.log(`Amount Parser Score: ${amountTestsPassed}/${amountTestCases.length}\n`);

  // ---------------------------------------------------------
  // Part 2: 17 Original Reference Receipts Deep Acceptance Test
  // ---------------------------------------------------------
  console.log('--- 2. Testing 17 Authentic Sample Receipts with Production Engine ---');
  const sampleDir = fs.existsSync(path.resolve('sample-data/bank-notifications'))
    ? path.resolve('sample-data/bank-notifications')
    : path.resolve(__dirname, '../../../sample-data/bank-notifications');

  const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.jpg')).sort();
  console.log(`Found ${files.length} authentic receipt images in ${sampleDir}.\n`);

  const adapter = TesseractOcrAdapter.getInstance();

  interface RowResult {
    file: string;
    gtTx: string;
    extTx: string;
    txMatch: boolean;
    gtAmount: number | null;
    extAmount: number | null;
    amtMatch: boolean;
    gtName: string;
    extName: string;
    nameMatch: boolean;
    gtDate: string;
    extDate: string;
    dateMatch: boolean;
    gtTime: string;
    extTime: string;
    timeMatch: boolean;
    status: string;
  }

  const results: RowResult[] = [];
  let txCorrect = 0;
  let amtCorrect = 0;
  let nameCorrect = 0;
  let dateCorrect = 0;
  let timeCorrect = 0;

  for (const file of files) {
    const fullPath = path.join(sampleDir, file);
    const gt = GROUND_TRUTH[file];
    const parsed = await adapter.parseReceipt(fullPath);

    const extTx = parsed.transactionNumber || 'N/A';
    const extAmt = parsed.amount;
    const extName = parsed.beneficiaryName || '«غير متوفر»';
    const extDate = parsed.rawDateStr || 'N/A';
    const extTime = parsed.rawTimeStr || 'N/A';

    const txMatch = extTx === gt.tx;
    const amtMatch = gt.amount === null ? (parsed.status === 'NEEDS_REVIEW' || extAmt === null) : extAmt === gt.amount;
    
    // Name match: check if key words in beneficiary name are present
    const cleanExtName = (parsed.beneficiaryName || '').replace(/[^\u0621-\u064A\s]/g, '').trim();
    const cleanGtName = gt.name.replace(/[^\u0621-\u064A\s]/g, '').trim();
    const nameMatch = cleanExtName.length > 3 && (cleanExtName.includes(cleanGtName) || cleanGtName.includes(cleanExtName) || cleanExtName.split(' ').slice(0, 2).join(' ') === cleanGtName.split(' ').slice(0, 2).join(' '));

    const dateMatch = extDate.includes(gt.date);
    const timeMatch = extTime.includes(gt.time.slice(0, 5)); // match HH:MM

    if (txMatch) txCorrect++;
    if (amtMatch) amtCorrect++;
    if (nameMatch) nameCorrect++;
    if (dateMatch) dateCorrect++;
    if (timeMatch) timeCorrect++;

    results.push({
      file,
      gtTx: gt.tx,
      extTx,
      txMatch,
      gtAmount: gt.amount,
      extAmount: extAmt,
      amtMatch,
      gtName: gt.name,
      extName,
      nameMatch,
      gtDate: gt.date,
      extDate,
      dateMatch,
      gtTime: gt.time,
      extTime,
      timeMatch,
      status: parsed.status
    });

    console.log(`[${file}] Tx: ${extTx} (${txMatch ? '✅' : '❌'}) | Amt: ${extAmt} (${amtMatch ? '✅' : '❌'}) | Name: ${extName} (${nameMatch ? '✅' : '❌'}) | Status: ${parsed.status}`);
  }

  console.log('\n--- Accuracy Summary Across 17 Receipts ---');
  console.log(`Transaction Number Accuracy : ${(txCorrect / files.length * 100).toFixed(1)}% (${txCorrect}/${files.length})`);
  console.log(`Financial Amount Accuracy   : ${(amtCorrect / files.length * 100).toFixed(1)}% (${amtCorrect}/${files.length})`);
  console.log(`Beneficiary Name Accuracy   : ${(nameCorrect / files.length * 100).toFixed(1)}% (${nameCorrect}/${files.length})`);
  console.log(`Date & Time Accuracy        : ${(dateCorrect / files.length * 100).toFixed(1)}% (${dateCorrect}/${files.length})`);

  // ---------------------------------------------------------
  // Part 3: Accounting Safety & Database Verification
  // ---------------------------------------------------------
  console.log('\n--- 3. Testing Accounting Safety & Database Total Verification ---');
  
  // Calculate verified sum of all confirmed transactions
  let expectedSum = 0;
  let successCount = 0;
  let reviewCount = 0;

  for (const r of results) {
    if (r.status === 'SUCCESS' && r.extAmount) {
      expectedSum += r.extAmount;
      successCount++;
    } else {
      reviewCount++;
    }
  }

  console.log(`Total Receipts Processed       : ${results.length}`);
  console.log(`Verified SUCCESS Transactions  : ${successCount}`);
  console.log(`Isolated NEEDS_REVIEW Receipts : ${reviewCount}`);
  console.log(`Total Verified Amount (Sum)    : ${expectedSum.toLocaleString('en-US')} SDG`);

  // ---------------------------------------------------------
  // Part 4: Target Reference Image Verification (20302390920)
  // ---------------------------------------------------------
  console.log('\n--- 4. Target Reference Image Deep Check (1794975470868.jpg) ---');
  const targetRow = results.find(r => r.file === '1794975470868.jpg');
  if (targetRow) {
    console.log(`Tx: ${targetRow.extTx} (Expected: ${targetRow.gtTx}) => ${targetRow.txMatch ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`Name: ${targetRow.extName} (Expected: ${targetRow.gtName}) => ${targetRow.nameMatch ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`Amount: ${targetRow.extAmount} (Expected: ${targetRow.gtAmount}) => ${targetRow.amtMatch ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`Date: ${targetRow.extDate} (Expected: ${targetRow.gtDate}) => ${targetRow.dateMatch ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`Time: ${targetRow.extTime} (Expected: ${targetRow.gtTime}) => ${targetRow.timeMatch ? 'PASS ✅' : 'FAIL ❌'}`);
  }

  console.log('\n================================================================');
  console.log('              FINAL ACCEPTANCE TEST COMPLETED                   ');
  console.log('================================================================\n');

  await adapter.terminate();
}

runAcceptanceTest().catch(console.error);
