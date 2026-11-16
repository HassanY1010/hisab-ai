import { Router } from 'express';
import { ExcelService } from '../services/excel-service';
import { prisma } from '../services/db';

export const reportsRouter = Router();

reportsRouter.get('/summary', async (req, res) => {
  try {
    const { direction, startDate, endDate, batchId } = req.query;

    const where: any = {};
    if (direction && (direction === 'INWARD' || direction === 'OUTWARD')) {
      where.direction = direction;
    }
    if (startDate || endDate) {
      where.receivedAt = {};
      if (startDate) where.receivedAt.gte = new Date(startDate as string);
      if (endDate) where.receivedAt.lte = new Date(endDate as string);
    }
    if (batchId && typeof batchId === 'string') {
      where.batchTransactions = { some: { batchId } };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        batchTransactions: { include: { batch: true } }
      },
      orderBy: { receivedAt: 'desc' }
    });

    const totalInward = transactions.filter(t => t.direction === 'INWARD').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalOutward = transactions.filter(t => t.direction === 'OUTWARD').reduce((acc, t) => acc + Number(t.amount), 0);
    const netBalance = totalInward - totalOutward;

    res.json({
      success: true,
      data: {
        totalInward,
        totalOutward,
        netBalance,
        count: transactions.length,
        transactions: transactions.map(t => ({
          ...t,
          amount: Number(t.amount)
        }))
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

reportsRouter.get('/excel', async (req, res) => {
  try {
    const { direction, startDate, endDate, batchId } = req.query;

    const options: any = {};
    if (direction && (direction === 'INWARD' || direction === 'OUTWARD')) {
      options.direction = direction;
    }
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);
    if (batchId) options.batchId = batchId as string;

    const excelBuffer = await ExcelService.generateReport(options);

    const filename = `HISAB_AI_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
