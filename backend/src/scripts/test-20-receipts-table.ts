import { prisma, withDbRetry } from '../services/db';
import { WhatsAppBotService } from '../services/whatsapp-bot-service';
import { NotificationQueueService } from '../services/notification-queue-service';
import { TransactionService } from '../services/transaction-service';
import { WhatsAppResponseFormatter, BatchTableRow } from '../services/whatsapp-response-formatter';
import path from 'path';

async function test20ReceiptsBatch() {
  console.log('========================================================================');
  console.log('  TESTING 20-NOTIFICATION BATCH TABLE GENERATION (REFERENCE IMAGE TEST)');
  console.log('========================================================================\n');

  await WhatsAppBotService.initDefaultConversations();
  const inwardConv = await prisma.conversation.findFirst({ where: { direction: 'INWARD' } });
  if (!inwardConv) throw new Error('Inward conversation not found');

  // Realistic Sudanese client names matching reference image
  const names20 = [
    'معاوية عثمان أحمد',
    'آدم هارون محمد',
    'مصطفى عبدالعزيز يوسف',
    'حسين محمد عبدالقادر',
    'نادية محمد عبدالله',
    'عائشة أحمد داؤود',
    'محمد سليمان',
    'الطيب عبد المحمود',
    'الطيب حسب الله الطيب',
    'مهدي محمد',
    'مهدي محمد',
    'مصطفى محمد',
    'احمد ادم',
    'عبدالعزيز عبدالله',
    'بحرالدين ابكر محمد',
    'حواء محمد عبدالله',
    'مزمل ابكر محمد',
    'صلوح صالح',
    'سلمي حميد عيد',
    'عيد احمد عيد'
  ];

  // Specific amounts for 20 receipts matching or similar to reference
  const amounts20 = [
    12300000, 10000000, 10000000, 12000000, 15000000,
    15000000, 12271000, 11700000, 13170000, 15000000,
    15000000, 15000000, 15000000, 11344000, 15000000,
    15000000, 15000000, 15000000, 15000000, 15000000
  ];

  const totalExpectedAmount = amounts20.reduce((a, b) => a + b, 0); // 272,785,000 SDG! Exactly matching the reference image!

  console.log(`[Setup] Creating dedicated batch of 20 receipts with total = ${totalExpectedAmount.toLocaleString('en-US')} SDG...`);

  const batch20 = await prisma.notificationBatch.create({
    data: {
      conversationId: inwardConv.id,
      direction: 'INWARD',
      status: 'PROCESSING',
      totalJobs: 20
    }
  });

  // Create progress message
  const progMsg = await prisma.chatMessage.create({
    data: {
      conversationId: inwardConv.id,
      sender: 'BOT',
      text: WhatsAppResponseFormatter.formatBatchProgress(0, 20),
      metadata: JSON.stringify({
        type: 'BATCH_PROGRESS',
        batchId: batch20.id,
        total: 20,
        completed: 0
      })
    }
  });

  await prisma.notificationBatch.update({
    where: { id: batch20.id },
    data: { summaryMessageId: progMsg.id }
  });

  // Register each transaction in the database and create a completed job
  const tableRows: BatchTableRow[] = [];

  for (let i = 0; i < 20; i++) {
    const txNumber = (8000000 + i * 17391).toString();
    const name = names20[i];
    const amount = amounts20[i];

    const reg = await TransactionService.registerTransaction({
      transactionNumber: txNumber,
      amount,
      direction: 'INWARD',
      beneficiaryName: name,
      transactionDate: new Date(),
      verificationStatus: 'VERIFIED'
    });

    const job = await prisma.imageProcessingJob.create({
      data: {
        batchId: batch20.id,
        conversationId: inwardConv.id,
        direction: 'INWARD',
        imagePath: `sample-data/synthetic_20_${i + 1}.jpg`,
        status: 'REGISTERED',
        extractedTxNumber: txNumber,
        extractedAmount: amount,
        transactionId: reg.transaction?.id,
        completedAt: new Date()
      }
    });

    tableRows.push({
      index: i + 1,
      name,
      txNumber,
      amount
    });

    // Emulate live progress updates
    if ((i + 1) % 5 === 0 || i === 19) {
      await prisma.chatMessage.update({
        where: { id: progMsg.id },
        data: {
          text: WhatsAppResponseFormatter.formatBatchProgress(i + 1, 20),
          metadata: JSON.stringify({
            type: 'BATCH_PROGRESS',
            batchId: batch20.id,
            total: 20,
            completed: i + 1
          })
        }
      });
      console.log(`⏳ Progress: ${i + 1} of 20 notifications processed...`);
    }
  }

  // Format final 20-receipt table summary
  const summaryText = WhatsAppResponseFormatter.formatBatchReceiptsTable({
    batchId: batch20.id,
    title: 'حساب إشعارات نزار', // Exactly matching reference title!
    totalReceived: 20,
    rows: tableRows,
    totalAmount: totalExpectedAmount,
    duplicateCount: 0,
    reviewCount: 0,
    failedCount: 0
  });

  // Transform progress message into final summary table
  await prisma.chatMessage.update({
    where: { id: progMsg.id },
    data: {
      text: summaryText,
      metadata: JSON.stringify({
        type: 'BATCH_TABLE_SUMMARY',
        batchId: batch20.id,
        totalReceived: 20,
        registeredCount: 20,
        totalAmount: totalExpectedAmount,
        rows: tableRows
      })
    }
  });

  await prisma.notificationBatch.update({
    where: { id: batch20.id },
    data: {
      status: 'COMPLETED',
      summarySent: true,
      registeredCount: 20,
      totalAmount: totalExpectedAmount,
      completedAt: new Date()
    }
  });

  console.log('\n--- [20-Notification Batch Table Summary Output] ---');
  console.log(summaryText);
  console.log('-----------------------------------------------------\n');

  // Verify assertions
  if (!summaryText.includes('272,785,000 SDG')) {
    throw new Error('Total amount does not match expected 272,785,000 SDG!');
  }
  if (!summaryText.includes('| 20 | عيد احمد عيد |')) {
    throw new Error('Missing row 20 or name in output table!');
  }

  console.log('✓ 20-Notification batch table perfectly generated and verified against reference image values!\n');
  await prisma.$disconnect();
  process.exit(0);
}

test20ReceiptsBatch().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
