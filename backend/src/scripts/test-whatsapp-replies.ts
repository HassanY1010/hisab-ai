import { prisma } from '../services/db';
import { WhatsAppBotService } from '../services/whatsapp-bot-service';
import { WhatsAppResponseFormatter } from '../services/whatsapp-response-formatter';
import path from 'path';

async function runComprehensiveTests() {
  console.log('===============================================================');
  console.log('  HISAB AI - COMPREHENSIVE WHATSAPP BOT TEMPLATES & AUDIT TEST  ');
  console.log('===============================================================\n');

  // 1. Initialize default conversations
  await WhatsAppBotService.initDefaultConversations();
  const inwardConv = await prisma.conversation.findFirst({ where: { direction: 'INWARD' } });
  const outwardConv = await prisma.conversation.findFirst({ where: { direction: 'OUTWARD' } });

  if (!inwardConv || !outwardConv) {
    throw new Error('Default conversations could not be initialized');
  }

  // Clear previous test records for clean, deterministic state
  await prisma.duplicateAttempt.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.batchTransaction.deleteMany();
  await prisma.transaction.deleteMany();
  console.log('✓ [DB] Cleaned test transactions, duplicate attempts, and chat messages.\n');

  // --------------------------------------------------------------------------
  // TEST CASE 1: Inward Receipt with Afternoon Time (Real Sample 6)
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 1: Inward Transfer with Afternoon Time (Real Sample 6)');
  console.log('---------------------------------------------------------------');
  const sample6Path = path.resolve(__dirname, '../../../sample-data/bank-notifications/1794831071730.jpg');
  const res1 = await WhatsAppBotService.processMessage(inwardConv.id, '', sample6Path, undefined, '1794831071730.jpg');

  console.log('\n[Actual WhatsApp Bot Reply 1]:');
  console.log(res1.botResponse.text);
  console.log('---------------------------------------------------------------');

  const reply1 = res1.botResponse.text;
  if (!reply1.includes('✅ *تم تسجيل الإشعار البنكي بنجاح*')) throw new Error('Test 1 Failed: Missing success title');
  if (!reply1.includes('20375262495')) throw new Error('Test 1 Failed: Missing transaction number 20375262495');
  if (!reply1.includes('*1,500,000 SDG*')) throw new Error('Test 1 Failed: Missing amount 1,500,000 SDG');
  if (!reply1.includes('*وارد (مستلم)*')) throw new Error('Test 1 Failed: Missing inward type *وارد (مستلم)*');
  if (!reply1.includes('15/11/2026')) throw new Error('Test 1 Failed: Missing date 15/11/2026');
  if (!reply1.includes('01:15:54 PM')) throw new Error('Test 1 Failed: Missing time with seconds (01:15:54 PM)');
  if (!reply1.includes('**** 0001')) throw new Error('Test 1 Failed: Missing masked account (**** 0001)');
  if (!reply1.includes('إجمالي الوارد: *1,500,000 SDG*')) throw new Error('Test 1 Failed: Missing inward total');
  if (!reply1.includes('إجمالي الصادر: *0 SDG*')) throw new Error('Test 1 Failed: Missing outward total');
  if (!reply1.includes('صافي الفرق: *1,500,000 SDG*')) throw new Error('Test 1 Failed: Missing net balance');
  if (!reply1.includes('عدد العمليات: *1*')) throw new Error('Test 1 Failed: Missing transaction count 1');
  console.log('✓ TEST 1 PASSED: Inward receipt registered, formatted, and totals updated in DB.\n');

  // --------------------------------------------------------------------------
  // TEST CASE 2: Receipt WITH Explicit Beneficiary / Payee Name
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 2: Format Receipt with Beneficiary Name (Rule 5 & Rule 7)');
  console.log('---------------------------------------------------------------');
  const replyWithBen = WhatsAppResponseFormatter.formatSuccess({
    transactionNumber: '20375262495',
    amount: 1500000,
    direction: 'INWARD',
    dateStr: '15/11/2026',
    timeStr: '01:15:54 PM',
    beneficiaryName: 'عائشة مضوي أحمد أبوشمه',
    receiverAccount: '0001 2932 0506 1363',
    stats: {
      totalInward: 1500000,
      totalOutward: 0,
      netBalance: 1500000,
      totalCount: 1
    }
  });

  console.log('\n[Actual WhatsApp Bot Reply 2 (With Beneficiary)]:');
  console.log(replyWithBen);
  console.log('---------------------------------------------------------------');

  if (!replyWithBen.includes('▫️ اسم المستفيد: عائشة مضوي أحمد أبوشمه')) {
    throw new Error('Test 2 Failed: Beneficiary line not displayed when present');
  }
  if (!replyWithBen.includes('**** 0001')) {
    throw new Error('Test 2 Failed: Masked account not displayed');
  }
  console.log('✓ TEST 2 PASSED: Beneficiary name correctly formatted and presented.\n');

  // --------------------------------------------------------------------------
  // TEST CASE 3: Duplicate Receipt Detection (Re-sending Sample 6)
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 3: Duplicate Receipt Detection (Re-sending Sample 6)');
  console.log('---------------------------------------------------------------');
  const res3 = await WhatsAppBotService.processMessage(inwardConv.id, '', sample6Path, undefined, '1794831071730.jpg');

  console.log('\n[Actual WhatsApp Bot Reply 3 (Duplicate)]:');
  console.log(res3.botResponse.text);
  console.log('---------------------------------------------------------------');

  const reply3 = res3.botResponse.text;
  if (!reply3.includes('⚠️ *تنبيه: هذه العملية مسجلة مسبقاً*')) throw new Error('Test 3 Failed: Missing duplicate title');
  if (!reply3.includes('20375262495')) throw new Error('Test 3 Failed: Missing duplicate transaction number');
  if (!reply3.includes('*1,500,000 SDG*')) throw new Error('Test 3 Failed: Missing duplicate amount');
  if (!reply3.includes('لم تتم إضافة العملية مرة أخرى')) throw new Error('Test 3 Failed: Missing duplicate prevention statement');
  if (!reply3.includes('لم تتغير الإجماليات المالية')) throw new Error('Test 3 Failed: Missing unchanged totals statement');

  // Verify DB state did not change
  const txCountAfterDup = await prisma.transaction.count();
  if (txCountAfterDup !== 1) throw new Error(`Test 3 Failed: Transaction table count changed! Expected 1, got ${txCountAfterDup}`);
  const dupLogCount = await prisma.duplicateAttempt.count();
  if (dupLogCount !== 1) throw new Error(`Test 3 Failed: DuplicateAttempt row not created in DB!`);
  console.log('✓ TEST 3 PASSED: Duplicate caught, totals untouched, attempt logged in DB.\n');

  // --------------------------------------------------------------------------
  // TEST CASE 4: Outward Transfer (Sample 3)
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 4: Outward Transfer (Sample 3)');
  console.log('---------------------------------------------------------------');
  const sample3Path = path.resolve(__dirname, '../../../sample-data/bank-notifications/1794831071639.jpg');
  const res4 = await WhatsAppBotService.processMessage(outwardConv.id, '', sample3Path, undefined, '1794831071639.jpg');

  console.log('\n[Actual WhatsApp Bot Reply 4 (Outward)]:');
  console.log(res4.botResponse.text);
  console.log('---------------------------------------------------------------');

  const reply4 = res4.botResponse.text;
  if (!reply4.includes('✅ *تم تسجيل الإشعار البنكي بنجاح*')) throw new Error('Test 4 Failed: Missing success title');
  if (!reply4.includes('20026330498')) throw new Error('Test 4 Failed: Missing Tx number 20026330498');
  if (!reply4.includes('*1,800,000 SDG*')) throw new Error('Test 4 Failed: Missing amount 1,800,000 SDG');
  if (!reply4.includes('*صادر (مرسل)*')) throw new Error('Test 4 Failed: Missing outward type *صادر (مرسل)*');
  if (!reply4.includes('15/11/2026')) throw new Error('Test 4 Failed: Missing date 15/11/2026');
  if (!reply4.includes('03:00:23 PM')) throw new Error('Test 4 Failed: Missing time 03:00:23 PM');
  if (!reply4.includes('إجمالي الوارد: *1,500,000 SDG*')) throw new Error('Test 4 Failed: Inward total changed unexpectedly');
  if (!reply4.includes('إجمالي الصادر: *1,800,000 SDG*')) throw new Error('Test 4 Failed: Outward total not updated to 1,800,000');
  if (!reply4.includes('صافي الفرق: *-300,000 SDG*')) throw new Error('Test 4 Failed: Net balance not updated to -300,000');
  if (!reply4.includes('عدد العمليات: *2*')) throw new Error('Test 4 Failed: Transaction count not 2');
  console.log('✓ TEST 4 PASSED: Outward transfer recorded, outward totals updated, inward preserved.\n');

  // --------------------------------------------------------------------------
  // TEST CASE 5: Midnight Timing (Sample 1: 00:06:50 -> 12:06:50 AM)
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 5: Midnight Timing Validation (Sample 1)');
  console.log('---------------------------------------------------------------');
  const sample1Path = path.resolve(__dirname, '../../../sample-data/bank-notifications/1794831071578.jpg');
  const res5 = await WhatsAppBotService.processMessage(inwardConv.id, '', sample1Path, undefined, '1794831071578.jpg');

  console.log('\n[Actual WhatsApp Bot Reply 5 (Midnight)]:');
  console.log(res5.botResponse.text);
  console.log('---------------------------------------------------------------');

  const reply5 = res5.botResponse.text;
  if (!reply5.includes('20188179228')) throw new Error('Test 5 Failed: Missing Tx number 20188179228');
  if (!reply5.includes('*1,000,000 SDG*')) throw new Error('Test 5 Failed: Missing amount 1,000,000 SDG');
  if (!reply5.includes('16/11/2026')) throw new Error('Test 5 Failed: Missing date 16/11/2026');
  if (!reply5.includes('12:06:50 AM')) throw new Error('Test 5 Failed: Midnight time 12:06:50 AM not preserved correctly');
  if (!reply5.includes('إجمالي الوارد: *2,500,000 SDG*')) throw new Error('Test 5 Failed: Inward total not updated to 2,500,000');
  if (!reply5.includes('صافي الفرق: *700,000 SDG*')) throw new Error('Test 5 Failed: Net balance not updated to 700,000');
  if (!reply5.includes('عدد العمليات: *3*')) throw new Error('Test 5 Failed: Count not 3');
  console.log('✓ TEST 5 PASSED: Midnight timing (12:06:50 AM) preserved with exact seconds.\n');

  // --------------------------------------------------------------------------
  // TEST CASE 6: Incomplete Essential Data (Missing Tx Number / Amount)
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 6: Incomplete Essential Data Handling (Needs Review)');
  console.log('---------------------------------------------------------------');
  const incompleteReply = WhatsAppResponseFormatter.formatIncompleteData({
    transactionNumber: null,
    amount: 500000,
    dateStr: '15/11/2026',
    timeStr: '02:30:15 PM',
    reason: 'تعذر استخراج رقم العملية بدقة'
  });

  console.log('\n[Actual WhatsApp Bot Reply 6 (Incomplete)]:\n' + incompleteReply);
  console.log('---------------------------------------------------------------');

  if (!incompleteReply.includes('⚠️ *الإشعار يحتاج إلى مراجعة*')) throw new Error('Test 6 Failed: Missing review title');
  if (!incompleteReply.includes('رقم العملية: غير مؤكد')) throw new Error('Test 6 Failed: Missing unconfirmed tx note');
  if (!incompleteReply.includes('*500,000 SDG*')) throw new Error('Test 6 Failed: Missing extracted amount');
  if (!incompleteReply.includes('لم يتم اعتماد العملية تلقائياً')) throw new Error('Test 6 Failed: Missing non-approval statement');
  console.log('✓ TEST 6 PASSED: Incomplete data safely flagged without corrupting accounts.\n');

  // --------------------------------------------------------------------------
  // TEST CASE 7: Extraction Failed (Unreadable / Non-Receipt Image)
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 7: Extraction Failed (Unclear / Non-Receipt Image)');
  console.log('---------------------------------------------------------------');
  const failedReply = WhatsAppResponseFormatter.formatExtractionFailed();
  console.log('\n[Actual WhatsApp Bot Reply 7 (Extraction Failed)]:\n' + failedReply);
  console.log('---------------------------------------------------------------');

  if (!failedReply.includes('⚠️ *تعذر استخراج بيانات الإشعار*')) throw new Error('Test 7 Failed: Missing extraction failed title');
  if (!failedReply.includes('لم يتم تسجيل أي عملية في الحسابات')) throw new Error('Test 7 Failed: Missing no-op confirmation');
  console.log('✓ TEST 7 PASSED: Extraction failure handles unreadable images gracefully.\n');

  // --------------------------------------------------------------------------
  // TEST CASE 8: Processing Failure Template (Security & Clarity)
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 8: Processing Failure Template (Security & Clarity)');
  console.log('---------------------------------------------------------------');
  const sysFailReply = WhatsAppResponseFormatter.formatFailure();
  console.log('\n[Actual WhatsApp Bot Reply 8 (Failure)]:\n' + sysFailReply);
  console.log('---------------------------------------------------------------');

  if (!sysFailReply.includes('❌ *تعذر إكمال معالجة الإشعار*')) throw new Error('Test 8 Failed: Missing failure title');
  if (!sysFailReply.includes('لم تتأثر أي بيانات أو إجماليات مالية')) throw new Error('Test 8 Failed: Missing financial safety note');
  if (sysFailReply.toLowerCase().includes('prisma') || sysFailReply.toLowerCase().includes('error:')) {
    throw new Error('Test 8 Failed: Internal system details leaked!');
  }
  console.log('✓ TEST 8 PASSED: Failure template is clear, secure, and preserves data integrity.\n');

  console.log('===============================================================');
  console.log('   ALL 8 WHATSAPP BOT AUDIT & TEMPLATE TESTS PASSED (100%)    ');
  console.log('===============================================================');
}

runComprehensiveTests()
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
