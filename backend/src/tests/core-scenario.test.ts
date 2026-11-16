import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../services/db';
import { TransactionService } from '../services/transaction-service';
import { BatchService } from '../services/batch-service';

describe('HISAB AI Core Financial & Duplicate Prevention Scenario', () => {
  beforeEach(async () => {
    // Clean test data
    await prisma.duplicateAttempt.deleteMany();
    await prisma.batchTransaction.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.transaction.deleteMany();
  });

  it('Requirement 9: Executes the 3-transaction financial scenario and catches duplicate on retry', async () => {
    // Step 1: Operation 1 - Inward 5,000,000 SDG with TxID TEST10001
    const res1 = await TransactionService.registerTransaction({
      transactionNumber: 'TEST10001',
      amount: 5000000,
      direction: 'INWARD'
    });
    expect(res1.status).toBe('SUCCESS');
    expect(Number(res1.transaction.amount)).toBe(5000000);

    // Step 2: Operation 2 - Inward 3,000,000 SDG with TxID TEST10002
    const res2 = await TransactionService.registerTransaction({
      transactionNumber: 'TEST10002',
      amount: 3000000,
      direction: 'INWARD'
    });
    expect(res2.status).toBe('SUCCESS');
    expect(Number(res2.transaction.amount)).toBe(3000000);

    // Step 3: Operation 3 - Outward 500,000 SDG with TxID TEST10003
    const res3 = await TransactionService.registerTransaction({
      transactionNumber: 'TEST10003',
      amount: 500000,
      direction: 'OUTWARD'
    });
    expect(res3.status).toBe('SUCCESS');
    expect(Number(res3.transaction.amount)).toBe(500000);

    // Verify Financial Math
    const statsInitial = await TransactionService.getFinancialStats();
    expect(statsInitial.totalInward).toBe(8000000);
    expect(statsInitial.totalOutward).toBe(500000);
    expect(statsInitial.netBalance).toBe(7500000);
    expect(statsInitial.totalTransactions).toBe(3);
    expect(statsInitial.duplicateCount).toBe(0);

    // Step 4: Re-send Operation 1 (TEST10001) with same or formatted TxID
    const duplicateRetry = await TransactionService.registerTransaction({
      transactionNumber: '  test10001  ', // Test normalization too!
      amount: 5000000,
      direction: 'INWARD'
    });

    // Verify Duplicate Handling
    expect(duplicateRetry.status).toBe('DUPLICATE');
    expect(duplicateRetry.duplicateDetails).toBeDefined();
    expect(duplicateRetry.duplicateDetails?.originalTransaction.transactionNumber).toBe('TEST10001');

    // Verify that Inward total has NOT increased!
    const statsAfterDuplicate = await TransactionService.getFinancialStats();
    expect(statsAfterDuplicate.totalInward).toBe(8000000); // MUST REMAIN 8,000,000!
    expect(statsAfterDuplicate.totalOutward).toBe(500000);
    expect(statsAfterDuplicate.netBalance).toBe(7500000);
    expect(statsAfterDuplicate.totalTransactions).toBe(3); // Unique count remains 3!
    expect(statsAfterDuplicate.duplicateCount).toBe(1); // 1 duplicate attempt recorded!

    // Verify DuplicateAttempt table
    const recordedAttempts = await prisma.duplicateAttempt.findMany();
    expect(recordedAttempts.length).toBe(1);
    expect(recordedAttempts[0].transactionNumber).toBe('  test10001  ');
  });

  it('Session / Batch ("السير") Management: Create, Add, Merge, and Split Batches', async () => {
    // Create 2 inward transactions
    const txA = await TransactionService.registerTransaction({
      transactionNumber: 'TX-BATCH-001',
      amount: 1000000,
      direction: 'INWARD'
    });
    const txB = await TransactionService.registerTransaction({
      transactionNumber: 'TX-BATCH-002',
      amount: 2000000,
      direction: 'INWARD'
    });
    const txC = await TransactionService.registerTransaction({
      transactionNumber: 'TX-BATCH-003',
      amount: 4000000,
      direction: 'INWARD'
    });

    // 1. Create Batch 1
    const batch1 = await BatchService.createBatch('سير الصباح رقم 1', 'INWARD');
    await BatchService.addTransactionsToBatch(batch1.id, [txA.transaction.id, txB.transaction.id]);

    const batch1Details = await BatchService.getBatchDetails(batch1.id);
    expect(batch1Details?.totalAmount).toBe(3000000);
    expect(batch1Details?.transactionCount).toBe(2);

    // 2. Create Batch 2
    const batch2 = await BatchService.createBatch('سير الظهيرة رقم 2', 'INWARD');
    await BatchService.addTransactionsToBatch(batch2.id, [txC.transaction.id]);

    const batch2Details = await BatchService.getBatchDetails(batch2.id);
    expect(batch2Details?.totalAmount).toBe(4000000);
    expect(batch2Details?.transactionCount).toBe(1);

    // 3. Merge Batch 1 and Batch 2
    const merged = await BatchService.mergeBatches([batch1.id, batch2.id], 'سير اليوم المجمع');
    const mergedDetails = await BatchService.getBatchDetails(merged.id);
    expect(mergedDetails?.totalAmount).toBe(7000000);
    expect(mergedDetails?.transactionCount).toBe(3);

    // 4. Split Batch: move txA to a separate batch
    const split = await BatchService.splitBatch(merged.id, [txA.transaction.id], 'سير العمليات المفصولة');
    const splitDetails = await BatchService.getBatchDetails(split.id);
    expect(splitDetails?.totalAmount).toBe(1000000);
    expect(splitDetails?.transactionCount).toBe(1);

    const mergedAfterSplit = await BatchService.getBatchDetails(merged.id);
    expect(mergedAfterSplit?.totalAmount).toBe(6000000);
    expect(mergedAfterSplit?.transactionCount).toBe(2);
  });
});
