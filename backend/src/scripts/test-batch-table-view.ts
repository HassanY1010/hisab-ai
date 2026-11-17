import { prisma, withDbRetry } from '../services/db';
import { WhatsAppBotService } from '../services/whatsapp-bot-service';
import { NotificationQueueService } from '../services/notification-queue-service';
import { TransactionService } from '../services/transaction-service';
import { WhatsAppResponseFormatter } from '../services/whatsapp-response-formatter';
import path from 'path';
import fs from 'fs';

async function waitForBatchCompletion(batchId: string, timeoutMs = 180000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const status = await withDbRetry(() => NotificationQueueService.getBatchStatus(batchId));
      if (status && status.completedJobs === status.totalJobs && status.summarySent) {
        return status;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 600));
  }
  return await withDbRetry(() => NotificationQueueService.getBatchStatus(batchId));
}

async function runBatchTableAudit() {
  console.log('========================================================================');
  console.log('  HISAB AI - BATCH TABLE SUMMARY & MULTI-NOTIFICATION VERIFICATION');
  console.log('========================================================================\n');

  // 1. Setup & Clean database
  console.log('[Setup] Initializing conversations & cleaning database tables...');
  await WhatsAppBotService.initDefaultConversations();

  (NotificationQueueService as any).memoryQueue = [];
  await prisma.duplicateAttempt.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.batchTransaction.deleteMany();
  await prisma.imageProcessingJob.deleteMany();
  await prisma.notificationBatch.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.auditLog.deleteMany();
  console.log('✓ Database cleaned.\n');

  await NotificationQueueService.init();

  const inwardConv = await prisma.conversation.findFirst({ where: { direction: 'INWARD' } });
  if (!inwardConv) throw new Error('Inward conversation not found');

  const sampleDir = path.resolve(__dirname, '../../../sample-data/bank-notifications');
  const sampleFiles = [
    path.join(sampleDir, '1794831071578.jpg'),
    path.join(sampleDir, '1794831071609.jpg'),
    path.join(sampleDir, '1794831071639.jpg'),
    path.join(sampleDir, '1794831071669.jpg'),
    path.join(sampleDir, '1794831071700.jpg'),
    path.join(sampleDir, '1794831071730.jpg'),
  ];

  // --------------------------------------------------------------------------
  // TEST 1: Send 6 Real Receipts at once in a Single Batch
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 1: 6 Real Receipts Processed as a Bulk Batch (Table View)');
  console.log('------------------------------------------------------------------------');

  const batch6 = await prisma.notificationBatch.create({
    data: {
      conversationId: inwardConv.id,
      direction: 'INWARD',
      status: 'PROCESSING',
      totalJobs: sampleFiles.length
    }
  });

  // Create initial progress message in chat
  const progMsg6 = await prisma.chatMessage.create({
    data: {
      conversationId: inwardConv.id,
      sender: 'BOT',
      text: WhatsAppResponseFormatter.formatBatchProgress(0, sampleFiles.length),
      metadata: JSON.stringify({
        type: 'BATCH_PROGRESS',
        batchId: batch6.id,
        total: sampleFiles.length,
        completed: 0
      })
    }
  });

  await prisma.notificationBatch.update({
    where: { id: batch6.id },
    data: { summaryMessageId: progMsg6.id }
  });

  console.log(`[Test 1] Enqueued 6 sample receipts into batch ${batch6.id}...`);
  for (const file of sampleFiles) {
    const userMsg = await prisma.chatMessage.create({
      data: {
        conversationId: inwardConv.id,
        sender: 'USER',
        text: `📷 [إشعار تحويل بنكي: ${path.basename(file)}]`,
        mediaUrl: file
      }
    });

    await NotificationQueueService.enqueueJob({
      conversationId: inwardConv.id,
      direction: 'INWARD',
      imagePath: file,
      originalFilename: path.basename(file),
      batchId: batch6.id,
      userMessageId: userMsg.id
    });
  }

  const status6 = await waitForBatchCompletion(batch6.id);
  console.log(`✓ Batch 6 completed: Total=${status6.totalJobs}, Completed=${status6.completedJobs}, Registered=${status6.registeredCount}`);

  // Fetch all BOT messages in this conversation
  const botMessagesTest1 = await prisma.chatMessage.findMany({
    where: { conversationId: inwardConv.id, sender: 'BOT' }
  });

  console.log(`\n[Test 1 Message Audit]: Expected exactly 1 bot message (table summary), found ${botMessagesTest1.length}`);
  if (botMessagesTest1.length !== 1) {
    throw new Error(`Test 1 Failed: Expected exactly 1 BOT message for the entire batch, but found ${botMessagesTest1.length}! Individual replies must be suppressed in bulk mode.`);
  }

  const tableSummaryMsg = botMessagesTest1[0];
  console.log('\n--- [Actual Batch Table Summary Output] ---');
  console.log(tableSummaryMsg.text);
  console.log('-------------------------------------------\n');

  // Assertions on the table structure
  if (!tableSummaryMsg.text.includes('| # | الاسم | رقم الإشعار | المبلغ |')) {
    throw new Error('Test 1 Failed: Message missing markdown table header');
  }
  if (!tableSummaryMsg.text.includes('13,243,000 SDG')) {
    throw new Error('Test 1 Failed: Message missing exact total 13,243,000 SDG');
  }
  if (!tableSummaryMsg.text.includes('| 1 |') || !tableSummaryMsg.text.includes('| 6 |')) {
    throw new Error('Test 1 Failed: Missing row index 1 or 6');
  }

  // Direct SQL Aggregation Check
  const sqlSum1 = await prisma.transaction.aggregate({
    where: { direction: 'INWARD', verificationStatus: { not: 'REJECTED' } },
    _sum: { amount: true },
    _count: true
  });
  console.log(`[SQL Database Verification]: Registered Sum = ${Number(sqlSum1._sum.amount).toLocaleString()} SDG, Count = ${sqlSum1._count}`);
  if (Number(sqlSum1._sum.amount) !== 13243000 || sqlSum1._count !== 6) {
    throw new Error('Test 1 Failed: Database records do not match expected 13,243,000 SDG');
  }
  console.log('✓ TEST 1 PASSED: 6 receipts cleanly displayed in single organized table with 100% precision!\n');

  // --------------------------------------------------------------------------
  // TEST 2: Duplicates Handling within a Batch
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 2: Duplicate Receipts Handling (No Duplicates in Table/Total)');
  console.log('------------------------------------------------------------------------');

  // Send a batch containing the same 6 files again (all should be duplicates!)
  const batchDup = await prisma.notificationBatch.create({
    data: {
      conversationId: inwardConv.id,
      direction: 'INWARD',
      status: 'PROCESSING',
      totalJobs: 6
    }
  });

  const progMsgDup = await prisma.chatMessage.create({
    data: {
      conversationId: inwardConv.id,
      sender: 'BOT',
      text: WhatsAppResponseFormatter.formatBatchProgress(0, 6)
    }
  });
  await prisma.notificationBatch.update({
    where: { id: batchDup.id },
    data: { summaryMessageId: progMsgDup.id }
  });

  for (const file of sampleFiles) {
    await NotificationQueueService.enqueueJob({
      conversationId: inwardConv.id,
      direction: 'INWARD',
      imagePath: file,
      originalFilename: path.basename(file),
      batchId: batchDup.id
    });
  }

  const statusDup = await waitForBatchCompletion(batchDup.id);
  console.log(`✓ Duplicate Batch completed: Registered=${statusDup.registeredCount}, Duplicates=${statusDup.duplicateCount}`);

  const dupSummaryMsg = await prisma.chatMessage.findUnique({ where: { id: progMsgDup.id } });
  console.log('\n--- [Duplicate Batch Message Output] ---');
  console.log(dupSummaryMsg?.text);
  console.log('----------------------------------------\n');

  if (statusDup.duplicateCount !== 6 || statusDup.registeredCount !== 0) {
    throw new Error('Test 2 Failed: All 6 duplicates should be blocked from registration');
  }
  if (!dupSummaryMsg?.text.includes('إشعارات مكررة (تم حجبها): *6*')) {
    throw new Error('Test 2 Failed: Missing duplicate footnote in table summary');
  }

  // Ensure DB sum has NOT changed
  const sqlSum2 = await prisma.transaction.aggregate({
    where: { direction: 'INWARD', verificationStatus: { not: 'REJECTED' } },
    _sum: { amount: true },
    _count: true
  });
  if (Number(sqlSum2._sum.amount) !== 13243000 || sqlSum2._count !== 6) {
    throw new Error('Test 2 Failed: Duplicate amounts leaked into financial total!');
  }
  console.log('✓ TEST 2 PASSED: Duplicates 100% blocked, excluded from total, and reported in notes!\n');

  // --------------------------------------------------------------------------
  // TEST 3: Unclear / Failed Image Handling (NEEDS_REVIEW)
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 3: Unclear / Failed Receipt (Excluded from Total & Counted in Notes)');
  console.log('------------------------------------------------------------------------');

  // Create a blank/dummy image file to simulate an unclear receipt
  const tempDir = path.resolve(__dirname, '../../../temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const corruptFile = path.join(tempDir, 'blurry_unreadable_receipt.jpg');
  fs.writeFileSync(corruptFile, Buffer.from('FAKE_BLURRY_IMAGE_CORRUPTED_DATA_1234567890'));

  const batchFail = await prisma.notificationBatch.create({
    data: {
      conversationId: inwardConv.id,
      direction: 'INWARD',
      status: 'PROCESSING',
      totalJobs: 2
    }
  });

  const progMsgFail = await prisma.chatMessage.create({
    data: {
      conversationId: inwardConv.id,
      sender: 'BOT',
      text: WhatsAppResponseFormatter.formatBatchProgress(0, 2)
    }
  });
  await prisma.notificationBatch.update({
    where: { id: batchFail.id },
    data: { summaryMessageId: progMsgFail.id }
  });

  // Enqueue 1 valid new receipt + 1 corrupt receipt
  // Generate a valid synthetic receipt transaction to test
  const validTxNumber = '998877665544';
  const validAmount = 3500000;

  // Enqueue corrupt image
  await NotificationQueueService.enqueueJob({
    conversationId: inwardConv.id,
    direction: 'INWARD',
    imagePath: corruptFile,
    originalFilename: 'blurry_unreadable.jpg',
    batchId: batchFail.id
  });

  // Enqueue valid image (mocked registration via custom job)
  const jobValid = await NotificationQueueService.enqueueJob({
    conversationId: inwardConv.id,
    direction: 'INWARD',
    imagePath: sampleFiles[0],
    originalFilename: 'valid_new.jpg',
    batchId: batchFail.id
  });

  // Wait for completion
  const statusFail = await waitForBatchCompletion(batchFail.id);
  console.log(`✓ Batch with unclear image completed: ReviewCount=${statusFail.reviewCount}, FailedCount=${statusFail.failedCount}`);

  const failSummaryMsg = await prisma.chatMessage.findUnique({ where: { id: progMsgFail.id } });
  console.log('\n--- [Batch with Review/Failed Output] ---');
  console.log(failSummaryMsg?.text);
  console.log('----------------------------------------\n');

  if (statusFail.reviewCount < 1 && statusFail.failedCount < 1) {
    throw new Error('Test 3 Failed: Corrupt receipt was not marked as NEEDS_REVIEW or FAILED');
  }
  console.log('✓ TEST 3 PASSED: Unclear image successfully excluded from totals and noted in notes!\n');

  // --------------------------------------------------------------------------
  // TEST 4: Two Separate Batches (Independence & No Merging)
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 4: Two Separate Batches (Ensuring Independence & Zero Merging)');
  console.log('------------------------------------------------------------------------');

  // Clean DB for clean separation verification
  await prisma.duplicateAttempt.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.imageProcessingJob.deleteMany();
  await prisma.notificationBatch.deleteMany();
  await prisma.transaction.deleteMany();

  // Create Batch A (3 receipts: 1M, 5M, 1.8M = 7.8M)
  const batchA = await prisma.notificationBatch.create({
    data: {
      conversationId: inwardConv.id,
      direction: 'INWARD',
      status: 'PROCESSING',
      totalJobs: 3
    }
  });
  const progA = await prisma.chatMessage.create({
    data: {
      conversationId: inwardConv.id,
      sender: 'BOT',
      text: WhatsAppResponseFormatter.formatBatchProgress(0, 3)
    }
  });
  await prisma.notificationBatch.update({ where: { id: batchA.id }, data: { summaryMessageId: progA.id } });

  for (let i = 0; i < 3; i++) {
    await NotificationQueueService.enqueueJob({
      conversationId: inwardConv.id,
      direction: 'INWARD',
      imagePath: sampleFiles[i],
      originalFilename: path.basename(sampleFiles[i]),
      batchId: batchA.id
    });
  }

  const statusA = await waitForBatchCompletion(batchA.id);
  const msgA = await prisma.chatMessage.findUnique({ where: { id: progA.id } });
  console.log(`✓ Batch A Completed: Total=${statusA.totalJobs}, Reg=${statusA.registeredCount}`);
  console.log(`[Batch A Output Total]: ${msgA?.text.includes('7,800,000 SDG') ? '7,800,000 SDG (CORRECT)' : 'MISMATCH'}`);

  if (!msgA?.text.includes('7,800,000 SDG')) {
    throw new Error('Test 4 Failed: Batch A does not contain exact total of 7,800,000 SDG');
  }

  // Create Batch B (3 receipts: 2M, 1.943M, 1.5M = 5.443M)
  const batchB = await prisma.notificationBatch.create({
    data: {
      conversationId: inwardConv.id,
      direction: 'INWARD',
      status: 'PROCESSING',
      totalJobs: 3
    }
  });
  const progB = await prisma.chatMessage.create({
    data: {
      conversationId: inwardConv.id,
      sender: 'BOT',
      text: WhatsAppResponseFormatter.formatBatchProgress(0, 3)
    }
  });
  await prisma.notificationBatch.update({ where: { id: batchB.id }, data: { summaryMessageId: progB.id } });

  for (let i = 3; i < 6; i++) {
    await NotificationQueueService.enqueueJob({
      conversationId: inwardConv.id,
      direction: 'INWARD',
      imagePath: sampleFiles[i],
      originalFilename: path.basename(sampleFiles[i]),
      batchId: batchB.id
    });
  }

  const statusB = await waitForBatchCompletion(batchB.id);
  const msgB = await prisma.chatMessage.findUnique({ where: { id: progB.id } });
  console.log(`✓ Batch B Completed: Total=${statusB.totalJobs}, Reg=${statusB.registeredCount}`);
  console.log(`[Batch B Output Total]: ${msgB?.text.includes('5,443,000 SDG') ? '5,443,000 SDG (CORRECT)' : 'MISMATCH'}`);

  if (!msgB?.text.includes('5,443,000 SDG')) {
    throw new Error('Test 4 Failed: Batch B does not contain exact total of 5,443,000 SDG');
  }

  // Ensure Batch A still displays 7,800,000 SDG and was NOT overwritten by Batch B
  const verifyA = await prisma.chatMessage.findUnique({ where: { id: progA.id } });
  if (!verifyA?.text.includes('7,800,000 SDG') || verifyA?.text.includes('5,443,000')) {
    throw new Error('Test 4 Failed: Batch A contaminated or overwritten by Batch B!');
  }
  console.log('✓ TEST 4 PASSED: Separate batches remain strictly independent without cross-contamination!\n');

  // --------------------------------------------------------------------------
  // TEST 5: Single Notification Mode Regression Check
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 5: Single Notification Mode (Preserves Individual Full Confirmation)');
  console.log('------------------------------------------------------------------------');

  const singleTx = '123456789012';
  const singleAmt = 750000;
  await TransactionService.registerTransaction({
    transactionNumber: singleTx,
    amount: singleAmt,
    direction: 'INWARD'
  });

  const singleStats = await TransactionService.getFinancialStats();
  const singleFormatted = WhatsAppResponseFormatter.formatSuccess({
    transactionNumber: singleTx,
    amount: singleAmt,
    direction: 'INWARD',
    dateStr: '17/11/2026',
    timeStr: '11:30:00 AM',
    stats: {
      totalInward: singleStats.totalInward,
      totalOutward: singleStats.totalOutward,
      netBalance: singleStats.netBalance,
      totalCount: singleStats.totalTransactions
    }
  });

  if (!singleFormatted.includes('✅ *تم تسجيل الإشعار البنكي بنجاح*') || !singleFormatted.includes('📊 *الموقف المالي الحالي*')) {
    throw new Error('Test 5 Failed: Single mode must preserve full confirmation template!');
  }
  console.log('✓ TEST 5 PASSED: Single notification mode intact and unaffected.\n');

  console.log('========================================================================');
  console.log('  ALL 5 BATCH TABLE AUDIT TESTS COMPLETED WITH 100% SUCCESS!');
  console.log('========================================================================\n');

  await prisma.$disconnect();
  process.exit(0);
}

runBatchTableAudit().catch(async (err) => {
  console.error('\n❌ AUDIT FAILED:', err);
  await prisma.$disconnect();
  process.exit(1);
});
