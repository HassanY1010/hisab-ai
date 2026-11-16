import { prisma } from './db';

export class BatchService {
  /**
   * Create a new session / batch ("سير")
   */
  public static async createBatch(name: string, direction: 'INWARD' | 'OUTWARD', notes?: string) {
    const batch = await prisma.batch.create({
      data: {
        name,
        direction,
        notes,
        status: 'OPEN'
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'BATCH_CREATED',
        entityType: 'Batch',
        entityId: batch.id,
        details: JSON.stringify({ name, direction })
      }
    });

    return batch;
  }

  /**
   * List all batches with total amount, item count, and direction
   */
  public static async listBatches(direction?: 'INWARD' | 'OUTWARD') {
    const whereClause = direction ? { direction } : {};
    const batches = await prisma.batch.findMany({
      where: whereClause,
      include: {
        batchTransactions: {
          include: {
            transaction: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return batches.map(b => {
      const totalAmount = b.batchTransactions.reduce((acc, bt) => acc + (bt.transaction ? Number(bt.transaction.amount) : 0), 0);
      const transactionCount = b.batchTransactions.length;
      return {
        id: b.id,
        name: b.name,
        direction: b.direction,
        status: b.status,
        notes: b.notes,
        createdAt: b.createdAt,
        closedAt: b.closedAt,
        totalAmount,
        transactionCount,
        transactions: b.batchTransactions.map(bt => bt.transaction)
      };
    });
  }

  /**
   * Get single batch with detailed transactions
   */
  public static async getBatchDetails(batchId: string) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        batchTransactions: {
          include: {
            transaction: true
          },
          orderBy: { addedAt: 'asc' }
        }
      }
    });

    if (!batch) return null;

    const totalAmount = batch.batchTransactions.reduce((acc, bt) => acc + (bt.transaction ? Number(bt.transaction.amount) : 0), 0);
    return {
      ...batch,
      totalAmount,
      transactionCount: batch.batchTransactions.length,
      transactions: batch.batchTransactions.map(bt => bt.transaction)
    };
  }

  /**
   * Add transactions to a batch
   */
  public static async addTransactionsToBatch(batchId: string, transactionIds: string[]) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('السير غير موجود');
    if (batch.status === 'CLOSED') throw new Error('لا يمكن تعديل سير مغلق');

    for (const txId of transactionIds) {
      const tx = await prisma.transaction.findUnique({ where: { id: txId } });
      if (tx && tx.direction !== batch.direction) {
        throw new Error(`لا يمكن إضافة عملية من نوع ${tx.direction} إلى سير من نوع ${batch.direction}`);
      }
      
      await prisma.batchTransaction.upsert({
        where: {
          batchId_transactionId: { batchId, transactionId: txId }
        },
        create: {
          batchId,
          transactionId: txId
        },
        update: {}
      });
    }

    return this.getBatchDetails(batchId);
  }

  /**
   * Remove a transaction from a batch
   */
  public static async removeTransactionFromBatch(batchId: string, transactionId: string) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('السير غير موجود');
    if (batch.status === 'CLOSED') throw new Error('لا يمكن تعديل سير مغلق');

    await prisma.batchTransaction.deleteMany({
      where: { batchId, transactionId }
    });

    return this.getBatchDetails(batchId);
  }

  /**
   * Merge two or more batches of the same direction into a target or new batch
   */
  public static async mergeBatches(sourceBatchIds: string[], newBatchName: string) {
    if (sourceBatchIds.length < 2) {
      throw new Error('يجب اختيار سيرين على الأقل للدمج');
    }

    const batches = await prisma.batch.findMany({
      where: { id: { in: sourceBatchIds } },
      include: { batchTransactions: true }
    });

    if (batches.length !== sourceBatchIds.length) {
      throw new Error('بعض السير المحددة غير موجودة');
    }

    const direction = batches[0].direction;
    const sameDirection = batches.every(b => b.direction === direction);
    if (!sameDirection) {
      throw new Error('لا يمكن دمج سير وارد مع سير صادر. يجب أن تكون جميع السير من نفس النوع.');
    }

    return await prisma.$transaction(async (tx) => {
      // Create new merged batch
      const mergedBatch = await tx.batch.create({
        data: {
          name: newBatchName,
          direction,
          status: 'OPEN',
          notes: `سير ناتج عن دمج السير: ${batches.map(b => b.name).join(' + ')}`
        }
      });

      // Transfer all unique transactions to new batch
      const txIdsSet = new Set<string>();
      batches.forEach(b => {
        b.batchTransactions.forEach(bt => txIdsSet.add(bt.transactionId));
      });

      for (const txId of txIdsSet) {
        await tx.batchTransaction.create({
          data: {
            batchId: mergedBatch.id,
            transactionId: txId
          }
        });
      }

      // Close the source batches
      await tx.batch.updateMany({
        where: { id: { in: sourceBatchIds } },
        data: {
          status: 'CLOSED',
          notes: `تم دمج هذا السير داخل السير الجديد: ${newBatchName}`
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'BATCH_MERGED',
          entityType: 'Batch',
          entityId: mergedBatch.id,
          details: JSON.stringify({
            sourceBatchIds,
            newBatchId: mergedBatch.id,
            transferredTxCount: txIdsSet.size
          })
        }
      });

      return mergedBatch;
    }, { maxWait: 20000, timeout: 35000 });
  }

  /**
   * Split a batch: move selected transactions into a new batch
   */
  public static async splitBatch(sourceBatchId: string, transactionIdsToMove: string[], newBatchName: string) {
    const sourceBatch = await prisma.batch.findUnique({
      where: { id: sourceBatchId },
      include: { batchTransactions: true }
    });

    if (!sourceBatch) throw new Error('السير الأصلي غير موجود');
    if (sourceBatch.status === 'CLOSED') throw new Error('لا يمكن فصل سير مغلق');
    if (!transactionIdsToMove || transactionIdsToMove.length === 0) {
      throw new Error('يجب تحديد عملية واحدة على الأقل لفصلها');
    }

    return await prisma.$transaction(async (tx) => {
      const splitBatch = await tx.batch.create({
        data: {
          name: newBatchName,
          direction: sourceBatch.direction,
          status: 'OPEN',
          notes: `سير مفصول من السير: ${sourceBatch.name}`
        }
      });

      for (const txId of transactionIdsToMove) {
        await tx.batchTransaction.deleteMany({
          where: { batchId: sourceBatchId, transactionId: txId }
        });
        await tx.batchTransaction.create({
          data: {
            batchId: splitBatch.id,
            transactionId: txId
          }
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'BATCH_SPLIT',
          entityType: 'Batch',
          entityId: splitBatch.id,
          details: JSON.stringify({
            sourceBatchId,
            splitBatchId: splitBatch.id,
            movedCount: transactionIdsToMove.length
          })
        }
      });

      return splitBatch;
    }, { maxWait: 20000, timeout: 35000 });
  }

  /**
   * Close or Reopen a batch
   */
  public static async setBatchStatus(batchId: string, status: 'OPEN' | 'CLOSED') {
    const batch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status,
        closedAt: status === 'CLOSED' ? new Date() : null
      }
    });

    await prisma.auditLog.create({
      data: {
        action: status === 'CLOSED' ? 'BATCH_CLOSED' : 'BATCH_REOPENED',
        entityType: 'Batch',
        entityId: batchId
      }
    });

    return batch;
  }
}
