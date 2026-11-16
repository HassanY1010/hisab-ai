import { ReceiptDateParser } from '../services/ocr/receipt-date-parser';

const cases = [
  { input: '15-Nov-2026 13:15:54', expectedDate: '15/11/2026', expectedTime: '01:15:54 PM' },
  { input: '15-Nov-2026 00:15:54', expectedDate: '15/11/2026', expectedTime: '12:15:54 AM' },
  { input: '15-Nov-2026 12:00:00', expectedDate: '15/11/2026', expectedTime: '12:00:00 PM' },
  { input: '15-Nov-2026 23:59:59', expectedDate: '15/11/2026', expectedTime: '11:59:59 PM' },
  { input: '13:15:54 15-Nov-2026', expectedDate: '15/11/2026', expectedTime: '01:15:54 PM' },
  { input: 'التاريخ و الزمن 13:15:54 \u200E15-Nov-2026\u200F', expectedDate: '15/11/2026', expectedTime: '01:15:54 PM' },
  { input: '15-Nov-2026', expectedDate: '15/11/2026', expectedTime: null },
  { input: '13:15:54', expectedDate: null, expectedTime: '01:15:54 PM' }
];

console.log('--- TESTING RECEIPT DATE PARSER ---');
let allPass = true;
for (const c of cases) {
  const p = ReceiptDateParser.parse(c.input);
  const datePass = p.formattedDate === c.expectedDate;
  const timePass = p.formattedTime === c.expectedTime;
  if (!datePass || !timePass) {
    allPass = false;
    console.error(`❌ FAIL: input="${c.input}" -> got Date=${p.formattedDate}, Time=${p.formattedTime} (Expected: Date=${c.expectedDate}, Time=${c.expectedTime})`);
  } else {
    console.log(`✅ PASS: "${c.input}" -> Date: ${p.formattedDate || 'none'} | Time: ${p.formattedTime || 'none'}`);
  }
}

if (!allPass) {
  console.error('\nTests failed!');
  process.exit(1);
} else {
  console.log('\nAll date parser tests passed successfully! 100%');
}
