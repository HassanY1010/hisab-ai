import { Router } from 'express';
import { TransactionService } from '../services/transaction-service';
import { prisma } from '../services/db';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', async (_req, res) => {
  try {
    const stats = await TransactionService.getFinancialStats();

    // Recent 6 transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 6,
      orderBy: { receivedAt: 'desc' },
      include: {
        batchTransactions: {
          include: { batch: true }
        }
      }
    });

    // 7-day trend chart data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const txsInWeek = await prisma.transaction.findMany({
      where: {
        receivedAt: { gte: sevenDaysAgo },
        verificationStatus: { not: 'REJECTED' }
      }
    });

    const chartMap: Record<string, { date: string; inward: number; outward: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' });
      chartMap[key] = { date: displayDate, inward: 0, outward: 0, count: 0 };
    }

    txsInWeek.forEach(tx => {
      const key = tx.receivedAt.toISOString().split('T')[0];
      if (chartMap[key]) {
        const numAmt = Number(tx.amount);
        if (tx.direction === 'INWARD') {
          chartMap[key].inward += numAmt;
        } else {
          chartMap[key].outward += numAmt;
        }
        chartMap[key].count += 1;
      }
    });

    const chartData = Object.values(chartMap);

    res.json({
      success: true,
      data: {
        stats,
        recentTransactions: recentTransactions.map(t => ({
          ...t,
          amount: Number(t.amount)
        })),
        chartData
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
