import { prisma, withDbRetry } from './db';
import { BankakReceiptParser } from './ocr/bankak-receipt-parser';
import { Prisma } from '@prisma/client';

export interface CreateTransactionInput {
  transactionNumber: string;
  amount: number | Prisma.Decimal;
  direction: 'INWARD' | 'OUTWARD';
  senderAccount?: string;
  receiverAccount?: string;
  beneficiaryName?: string;
  transactionDate?: Date;
  imagePath?: string;
  storageKey?: string;
  extractedText?: string;
  rawOcrJson?: string;
  ocrStatus?: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED' | 'MANUAL';
  verificationStatus?: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED';
}

export interface TransactionResult {
  status: 'SUCCESS' | 'DUPLICATE' | 'ERROR';
  message: string;
  transaction?: any;
  duplicateDetails?: {
    originalTransaction: any;
    attemptedAmount: number;
    amountMismatch: boolean;
    attemptId: string;
  };
}

export class TransactionService {
  /**
   * Registers a transaction with strict duplicate prevention:
   * 1. Normalizes transaction ID.
   * 2. Checks database for existing transaction with this normalized ID.
   * 3. If duplicate found:
   *    - Does NOT insert as new transaction or add to totals.
   *    - Records the DuplicateAttempt with timestamp, image, extracted amount.
   *    - Flags amount mismatch if attempted amount differs from original.
   *    - Logs action in AuditLog.
   * 4. If unique:
   *    - Inserts transaction with normalizedTxNumber.
   *    - Logs in AuditLog.
   */
  public static async registerTransaction(input: CreateTransactionInput): Promise<TransactionResult> {
    const normalizedTxNumber = BankakReceiptParser.normalizeTxNumber(input.transactionNumber);
    const numAmount = typeof input.amount === 'number' ? input.amount : Number(input.amount);

    if (!normalizedTxNumber) {
      return {
        status: 'ERROR',
        message: 'رقم العملية غير صالح أو فارغ.'
      };
    }

    if (numAmount <= 0 || isNaN(numAmount)) {
      return {
        status: 'ERROR',
        message: 'المبلغ غير صالح.'
      };
    }

    const decimalAmount = new Prisma.Decimal(numAmount);

    try {
      return await withDbRetry(() => prisma.$transaction(async (tx) => {
        // 1. Look for existing transaction with normalized TxNumber
        const existingTx = await tx.transaction.findUnique({
          where: { normalizedTxNumber }
        });

        if (existingTx) {
          // DUPLICATE DETECTED!
          const existingAmount = Number(existingTx.amount);
          const amountMismatch = Math.abs(existingAmount - numAmount) > 0.01;
          
          const duplicateAttempt = await tx.duplicateAttempt.create({
            data: {
              transactionNumber: input.transactionNumber,
              originalTransactionId: existingTx.id,
              attemptedImagePath: input.imagePath,
              storageKey: input.storageKey,
              extractedAmount: decimalAmount,
              reviewStatus: 'DETECTED',
              notes: amountMismatch
                ? `تحذير تكرار: المبلغ المستخرج (${numAmount.toLocaleString()} SDG) يختلف عن المبلغ المسجل الأصلي (${existingAmount.toLocaleString()} SDG)`
                : `محاولة تسجيل مكررة لنفس رقم العملية (${normalizedTxNumber})`
            }
          });

          await tx.auditLog.create({
            data: {
              action: 'DUPLICATE_ATTEMPT_DETECTED',
              entityType: 'Transaction',
              entityId: existingTx.id,
              details: JSON.stringify({
                transactionNumber: input.transactionNumber,
                normalizedTxNumber,
                attemptedAmount: numAmount,
                originalAmount: existingAmount,
                originalDate: existingTx.createdAt,
                amountMismatch,
                attemptId: duplicateAttempt.id
              })
            }
          });

          return {
            status: 'DUPLICATE',
            message: amountMismatch
              ? `تحذير شديد: العملية رقم ${normalizedTxNumber} مسجلة مسبقاً بمبلغ مختلف (${existingAmount.toLocaleString()} مقابل ${numAmount.toLocaleString()}). لم يُضف المبلغ للإجمالي!`
              : `تنبيه: العملية رقم ${normalizedTxNumber} مسجلة مسبقاً بتاريخ ${new Date(existingTx.createdAt).toLocaleString('ar-EG')}. تم رفض التكرار ولم يُضف المبلغ للإجمالي.`,
            duplicateDetails: {
              originalTransaction: existingTx,
              attemptedAmount: numAmount,
              amountMismatch,
              attemptId: duplicateAttempt.id
            }
          };
        }

        // 2. Insert new valid unique transaction
        const createdTx = await tx.transaction.create({
          data: {
            transactionNumber: input.transactionNumber,
            normalizedTxNumber,
            amount: decimalAmount,
            direction: input.direction,
            senderAccount: input.senderAccount,
            receiverAccount: input.receiverAccount,
            beneficiaryName: input.beneficiaryName,
            transactionDate: input.transactionDate || null,
            imagePath: input.imagePath,
            storageKey: input.storageKey,
            extractedText: input.extractedText,
            rawOcrJson: input.rawOcrJson,
            ocrStatus: input.ocrStatus || 'SUCCESS',
            verificationStatus: input.verificationStatus || 'VERIFIED'
          }
        });

        await tx.auditLog.create({
          data: {
            action: 'TRANSACTION_CREATED',
            entityType: 'Transaction',
            entityId: createdTx.id,
            details: JSON.stringify({
              transactionNumber: createdTx.transactionNumber,
              amount: numAmount,
              direction: createdTx.direction
            })
          }
        });

        return {
          status: 'SUCCESS',
          message: `تم تسجيل العملية رقم ${normalizedTxNumber} بنجاح بمبلغ ${numAmount.toLocaleString()} SDG.`,
          transaction: createdTx
        };
      }, { maxWait: 20000, timeout: 35000 }));
    } catch (err: any) {
      // Thread-safe concurrency: Handle unique constraint violation (P2002) when two identical transactions hit simultaneously
      if (err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'))) {
        const raceExisting = await withDbRetry(() => prisma.transaction.findUnique({
          where: { normalizedTxNumber }
        }));

        if (raceExisting) {
          const existingAmount = Number(raceExisting.amount);
          const amountMismatch = Math.abs(existingAmount - numAmount) > 0.01;

          const duplicateAttempt = await withDbRetry(() => prisma.duplicateAttempt.create({
            data: {
              transactionNumber: input.transactionNumber,
              originalTransactionId: raceExisting.id,
              attemptedImagePath: input.imagePath,
              storageKey: input.storageKey,
              extractedAmount: decimalAmount,
              reviewStatus: 'DETECTED',
              notes: `تم رصد ومطابقة التكرار المتزامن للعملية (${normalizedTxNumber}) بنجاح (Concurrency Race Protected)`
            }
          }));

          await withDbRetry(() => prisma.auditLog.create({
            data: {
              action: 'CONCURRENT_DUPLICATE_RACE_DETECTED',
              entityType: 'Transaction',
              entityId: raceExisting.id,
              details: JSON.stringify({
                transactionNumber: input.transactionNumber,
                normalizedTxNumber,
                attemptedAmount: numAmount,
                originalAmount: existingAmount,
                attemptId: duplicateAttempt.id
              })
            }
          }));

          return {
            status: 'DUPLICATE',
            message: `تنبيه: العملية رقم ${normalizedTxNumber} مسجلة مسبقاً. تم حجب التكرار المتزامن وحماية الحسابات المالية.`,
            duplicateDetails: {
              originalTransaction: raceExisting,
              attemptedAmount: numAmount,
              amountMismatch,
              attemptId: duplicateAttempt.id
            }
          };
        }
      }
      throw err;
    }
  }

  /**
   * Retrieves overall financial KPI statistics from database
   */
  public static async getFinancialStats() {
    // Inward totals
    const inwardTxs = await prisma.transaction.findMany({
      where: { direction: 'INWARD', verificationStatus: { not: 'REJECTED' } },
      select: { amount: true }
    });

    const outwardTxs = await prisma.transaction.findMany({
      where: { direction: 'OUTWARD', verificationStatus: { not: 'REJECTED' } },
      select: { amount: true }
    });

    const totalInward = inwardTxs.reduce((acc, t) => acc + Number(t.amount), 0);
    const totalOutward = outwardTxs.reduce((acc, t) => acc + Number(t.amount), 0);
    const netBalance = totalInward - totalOutward;
    const countInward = inwardTxs.length;
    const countOutward = outwardTxs.length;
    const totalTransactions = countInward + countOutward;

    // Duplicates caught count
    const duplicateCount = await prisma.duplicateAttempt.count();

    // Transactions pending review
    const pendingReviewCount = await prisma.transaction.count({
      where: { verificationStatus: 'PENDING_REVIEW' }
    });

    // Open batches count
    const openBatchesCount = await prisma.batch.count({
      where: { status: 'OPEN' }
    });

    return {
      totalInward,
      totalOutward,
      netBalance,
      totalTransactions,
      countInward,
      countOutward,
      duplicateCount,
      pendingReviewCount,
      openBatchesCount
    };
  }
}
