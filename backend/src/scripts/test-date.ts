import { ReceiptDateParser } from '../services/ocr/receipt-date-parser';

const raw = '20302390920\nرقم العملية\n17-Nov-2026 19:26:31\nالتاريخ و الزمن\nمن حساب';
console.log('Result:', JSON.stringify(ReceiptDateParser.parse(raw), null, 2));
