import { Router } from 'express';
import { z } from 'zod';
import { BatchService } from '../services/batch-service';

export const batchesRouter = Router();

const createBatchSchema = z.object({
  name: z.string().min(2),
  direction: z.enum(['INWARD', 'OUTWARD']),
  notes: z.string().optional()
});

batchesRouter.get('/', async (req, res) => {
  try {
    const direction = req.query.direction as 'INWARD' | 'OUTWARD' | undefined;
    const batches = await BatchService.listBatches(direction);
    res.json({ success: true, data: batches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

batchesRouter.get('/:id', async (req, res) => {
  try {
    const batch = await BatchService.getBatchDetails(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'السير غير موجود' });
    }
    res.json({ success: true, data: batch });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

batchesRouter.post('/', async (req, res) => {
  try {
    const validated = createBatchSchema.parse(req.body);
    const batch = await BatchService.createBatch(validated.name, validated.direction, validated.notes);
    res.status(201).json({ success: true, data: batch });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

batchesRouter.post('/:id/transactions', async (req, res) => {
  try {
    const { transactionIds } = req.body;
    if (!Array.isArray(transactionIds)) {
      return res.status(400).json({ success: false, error: 'transactionIds يجب أن تكون مصفوفة' });
    }
    const updated = await BatchService.addTransactionsToBatch(req.params.id, transactionIds);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

batchesRouter.delete('/:id/transactions/:txId', async (req, res) => {
  try {
    const updated = await BatchService.removeTransactionFromBatch(req.params.id, req.params.txId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

batchesRouter.post('/merge', async (req, res) => {
  try {
    const { sourceBatchIds, newBatchName } = req.body;
    if (!Array.isArray(sourceBatchIds) || sourceBatchIds.length < 2 || !newBatchName) {
      return res.status(400).json({ success: false, error: 'بيانات الدمج غير مكتملة (مطلوب سيرين على الأقل واسم السير الجديد)' });
    }
    const merged = await BatchService.mergeBatches(sourceBatchIds, newBatchName);
    res.json({ success: true, data: merged });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

batchesRouter.post('/split', async (req, res) => {
  try {
    const { sourceBatchId, transactionIdsToMove, newBatchName } = req.body;
    if (!sourceBatchId || !Array.isArray(transactionIdsToMove) || !newBatchName) {
      return res.status(400).json({ success: false, error: 'بيانات الفصل غير مكتملة' });
    }
    const split = await BatchService.splitBatch(sourceBatchId, transactionIdsToMove, newBatchName);
    res.json({ success: true, data: split });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

batchesRouter.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'OPEN' && status !== 'CLOSED') {
      return res.status(400).json({ success: false, error: 'الحالة يجب أن تكون إما OPEN أو CLOSED' });
    }
    const updated = await BatchService.setBatchStatus(req.params.id, status);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
