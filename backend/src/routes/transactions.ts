import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db';
import { TransactionService } from '../services/transaction-service';

export const transactionsRouter = Router();

const createTxSchema = z.object({
  transactionNumber: z.string().min(3),
  amount: z.number().positive(),
  direction: z.enum(['INWARD', 'OUTWARD']),
  senderAccount: z.string().optional(),
  receiverAccount: z.string().optional(),
  beneficiaryName: z.string().optional(),
  transactionDate: z.string().optional(),
  imagePath: z.string().optional(),
  storageKey: z.string().optional(),
  extractedText: z.string().optional(),
  ocrStatus: z.enum(['SUCCESS', 'NEEDS_REVIEW', 'FAILED', 'MANUAL']).optional(),
  verificationStatus: z.enum(['VERIFIED', 'PENDING_REVIEW', 'REJECTED']).optional()
});

transactionsRouter.get('/', async (req, res) => {
  try {
    const { direction, search, status, batchId } = req.query;

    const where: any = {};
    if (direction && (direction === 'INWARD' || direction === 'OUTWARD')) {
      where.direction = direction;
    }
    if (status && typeof status === 'string') {
      where.verificationStatus = status;
    }
    if (batchId && typeof batchId === 'string') {
      where.batchTransactions = {
        some: { batchId }
      };
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { transactionNumber: { contains: search } },
        { beneficiaryName: { contains: search } },
        { senderAccount: { contains: search } },
        { receiverAccount: { contains: search } }
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        batchTransactions: {
          include: { batch: true }
        },
        duplicateAttempts: true
      },
      orderBy: { receivedAt: 'desc' }
    });

    res.json({
      success: true,
      data: transactions.map(t => ({
        ...t,
        amount: Number(t.amount)
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

transactionsRouter.get('/:id', async (req, res) => {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        batchTransactions: { include: { batch: true } },
        duplicateAttempts: true
      }
    });

    if (!tx) {
      return res.status(404).json({ success: false, error: 'العملية غير موجودة' });
    }

    res.json({
      success: true,
      data: {
        ...tx,
        amount: Number(tx.amount)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

transactionsRouter.post('/', async (req, res) => {
  try {
    const validated = createTxSchema.parse(req.body);

    const result = await TransactionService.registerTransaction({
      transactionNumber: validated.transactionNumber,
      amount: validated.amount,
      direction: validated.direction,
      senderAccount: validated.senderAccount,
      receiverAccount: validated.receiverAccount,
      beneficiaryName: validated.beneficiaryName,
      transactionDate: validated.transactionDate ? new Date(validated.transactionDate) : undefined,
      imagePath: validated.imagePath,
      storageKey: validated.storageKey,
      extractedText: validated.extractedText,
      ocrStatus: validated.ocrStatus || 'MANUAL',
      verificationStatus: validated.verificationStatus || 'VERIFIED'
    });

    if (result.status === 'DUPLICATE') {
      return res.status(409).json({ success: false, duplicate: true, data: result });
    }

    if (result.status === 'ERROR') {
      return res.status(400).json({ success: false, error: result.message });
    }

    res.status(201).json({
      success: true,
      data: {
        ...result.transaction,
        amount: Number(result.transaction.amount)
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.issues });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

transactionsRouter.put('/:id', async (req, res) => {
  try {
    const { amount, beneficiaryName, verificationStatus } = req.body;
    const tx = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        ...(amount ? { amount: Number(amount) } : {}),
        ...(beneficiaryName !== undefined ? { beneficiaryName } : {}),
        ...(verificationStatus ? { verificationStatus } : {})
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'TRANSACTION_UPDATED',
        entityType: 'Transaction',
        entityId: tx.id,
        details: JSON.stringify(req.body)
      }
    });

    res.json({
      success: true,
      data: {
        ...tx,
        amount: Number(tx.amount)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
