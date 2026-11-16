import { BankakReceiptParser } from '../services/ocr/bankak-receipt-parser';

const sample6Text = `
تحويلات
رقم العملية 20375262495
التاريخ و الزمن 13:15:54 \u200E15-Nov-2026\u200F
‏من حساب 1 9436 0645 1363
الى حساب 0001 2932 0506 1363
رقم الموبايل ‎N/A‏
‏التعليق ‎N/A‏
‏المبلغ 1,500,000.00
`;

const res = BankakReceiptParser.parse(sample6Text);
console.log('Result for sample 6:');
console.log('txId:', res.normalizedTxNumber);
console.log('amount:', res.amount);
console.log('formattedDate:', res.formattedDate);
console.log('formattedTime:', res.formattedTime);
console.log('formattedDateTime:', res.formattedDateTime);
console.log('hasTime:', res.hasTime);
console.log('receiverAccount:', res.receiverAccount);

