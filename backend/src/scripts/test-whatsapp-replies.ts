import { prisma } from '../services/db';
import { WhatsAppBotService } from '../services/whatsapp-bot-service';
import { WhatsAppResponseFormatter } from '../services/whatsapp-response-formatter';
import path from 'path';

async function runIntegrationTest() {
  console.log('=== STARTING WHATSAPP REPLIES & OCR INTEGRATION TEST ===\n');

  // 1. Initialize default conversations
  await WhatsAppBotService.initDefaultConversations();
  const inwardConv = await prisma.conversation.findFirst({ where: { direction: 'INWARD' } });
  const outwardConv = await prisma.conversation.findFirst({ where: { direction: 'OUTWARD' } });

  if (!inwardConv || !outwardConv) {
    throw new Error('Default conversations could not be initialized');
  }

  // Clear previous test records for clean run
  await prisma.duplicateAttempt.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.batchTransaction.deleteMany();
  await prisma.transaction.deleteMany();
  console.log('✓ Cleaned previous test transactions from database.');

  // 2. Test Success Inward with sample 6 (1794831071730.jpg)
  const sample6Path = path.resolve(__dirname, '../../../sample-data/bank-notifications/1794831071730.jpg');
  console.log(`\n1. Processing Inward Sample 6 (${sample6Path})...`);
  const res1 = await WhatsAppBotService.processMessage(inwardConv.id, '', sample6Path, undefined, '1794831071730.jpg');

  console.log('\n--- BOT REPLY 1 (SUCCESS INWARD) ---');
  console.log(res1.botResponse.text);
  console.log('------------------------------------\n');

  // Assertions for Reply 1
  const reply1 = res1.botResponse.text;
  if (!reply1.includes('✅ *تم تسجيل الإشعار البنكي بنجاح*')) throw new Error('Missing success title');
  if (!reply1.includes('20375262495')) throw new Error('Missing transaction number');
  if (!reply1.includes('1,500,000 SDG')) throw new Error('Missing amount');
  if (!reply1.includes('وارد (مستلم)')) throw new Error('Missing inward label');
  if (!reply1.includes('15/11/2026')) throw new Error('Missing date');
  if (!reply1.includes('01:15:54 PM')) throw new Error('Missing exact time with seconds (01:15:54 PM)');
  if (!reply1.includes('**** 0001')) throw new Error('Missing masked account (**** 0001)');
  if (!reply1.includes('إجمالي الوارد: *1,500,000 SDG*')) throw new Error('Missing inward total');
  if (!reply1.includes('إجمالي الصادر: *0 SDG*')) throw new Error('Missing outward total');
  if (!reply1.includes('صافي الفرق: *1,500,000 SDG*')) throw new Error('Missing net balance');
  console.log('✓ Reply 1 passed all 10 visual & data assertions perfectly.');

  // 3. Test Duplicate Detection by sending Sample 6 again
  console.log('\n2. Re-sending Sample 6 (Duplicate Test)...');
  const res2 = await WhatsAppBotService.processMessage(inwardConv.id, '', sample6Path, undefined, '1794831071730.jpg');

  console.log('\n--- BOT REPLY 2 (DUPLICATE DETECTION) ---');
  console.log(res2.botResponse.text);
  console.log('-----------------------------------------\n');

  const reply2 = res2.botResponse.text;
  if (!reply2.includes('⚠️ *تنبيه: هذه العملية مسجلة مسبقاً*')) throw new Error('Missing duplicate alert title');
  if (!reply2.includes('20375262495')) throw new Error('Missing duplicate transaction number');
  if (!reply2.includes('1,500,000 SDG')) throw new Error('Missing duplicate amount');
  if (!reply2.includes('لم تتم إضافة العملية مرة أخرى')) throw new Error('Missing duplicate prevention notice');
  if (!reply2.includes('لم تتغير الإجماليات المالية')) throw new Error('Missing financial unchanged notice');
  console.log('✓ Reply 2 passed all duplicate assertions.');

  // 4. Verify Database Duplicate Attempt was logged
  const dupCount = await prisma.duplicateAttempt.count();
  if (dupCount !== 1) throw new Error(`Expected 1 duplicate attempt in DB, got ${dupCount}`);
  console.log('✓ Duplicate attempt strictly logged in DuplicateAttempt table.');

  // 5. Test Outward Transfer with sample 3 (1794831071639.jpg)
  const sample3Path = path.resolve(__dirname, '../../../sample-data/bank-notifications/1794831071639.jpg');
  console.log(`\n3. Processing Outward Sample 3 (${sample3Path})...`);
  const res3 = await WhatsAppBotService.processMessage(outwardConv.id, '', sample3Path, undefined, '1794831071639.jpg');

  console.log('\n--- BOT REPLY 3 (SUCCESS OUTWARD) ---');
  console.log(res3.botResponse.text);
  console.log('-------------------------------------\n');

  const reply3 = res3.botResponse.text;
  if (!reply3.includes('✅ *تم تسجيل الإشعار البنكي بنجاح*')) throw new Error('Missing success title');
  if (!reply3.includes('صادر (مدفوع)')) throw new Error('Missing outward label');
  if (!reply3.includes('1,800,000 SDG')) throw new Error('Missing amount 1,800,000');
  if (!reply3.includes('03:00:23 PM')) throw new Error('Missing time 03:00:23 PM');
  if (!reply3.includes('إجمالي الوارد: *1,500,000 SDG*')) throw new Error('Inward total changed unexpectedly');
  if (!reply3.includes('إجمالي الصادر: *1,800,000 SDG*')) throw new Error('Outward total not updated to 1,800,000');
  if (!reply3.includes('صافي الفرق: *-300,000 SDG*')) throw new Error('Net balance not updated correctly (-300,000)');
  console.log('✓ Reply 3 passed all outward assertions.');

  // 6. Test Review Needed Formatter
  console.log('\n4. Testing Review Needed Formatter...');
  const reviewMsg = WhatsAppResponseFormatter.formatReviewNeeded({
    amount: 50000,
    transactionNumber: null,
    dateStr: '15/11/2026',
    timeStr: null,
    reason: 'رقم العملية غير واضح'
  });
  console.log('\n--- BOT REPLY 4 (NEEDS REVIEW) ---');
  console.log(reviewMsg);
  console.log('----------------------------------\n');
  if (!reviewMsg.includes('⚠️ *الإشعار يحتاج إلى مراجعة*')) throw new Error('Missing review title');
  if (!reviewMsg.includes('غير واضح')) throw new Error('Missing placeholder for missing fields');
  console.log('✓ Review needed template verified.');

  console.log('\n================ ALL INTEGRATION TESTS PASSED 100% ================');
}

runIntegrationTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
