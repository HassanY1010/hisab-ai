import { Router } from 'express';
import { prisma } from '../services/db';

export const duplicatesRouter = Router();

duplicatesRouter.get('/', async (_req, res) => {
  try {
    const duplicates = await prisma.duplicateAttempt.findMany({
      include: {
        originalTransaction: true
      },
      orderBy: { attemptedAt: 'desc' }
    });

    res.json({
      success: true,
      data: duplicates.map(d => ({
        ...d,
        extractedAmount: d.extractedAmount ? Number(d.extractedAmount) : null,
        originalTransaction: d.originalTransaction ? {
          ...d.originalTransaction,
          amount: Number(d.originalTransaction.amount)
        } : null
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
