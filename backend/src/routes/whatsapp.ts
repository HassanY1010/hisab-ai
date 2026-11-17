import { Router } from 'express';
import { prisma } from '../services/db';
import { WhatsAppBotService } from '../services/whatsapp-bot-service';
import { NotificationQueueService } from '../services/notification-queue-service';
import { upload } from '../middlewares/upload';

export const whatsappRouter = Router();

whatsappRouter.get('/conversations', async (_req, res) => {
  try {
    await WhatsAppBotService.initDefaultConversations();
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

whatsappRouter.get('/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: req.params.id },
      include: { transaction: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json({
      success: true,
      data: messages.map(m => ({
        ...m,
        transaction: m.transaction ? {
          ...m.transaction,
          amount: Number(m.transaction.amount)
        } : null
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Rapid single notification reception - returns immediately without blocking on OCR
 */
whatsappRouter.post('/conversations/:id/messages', upload.single('image'), async (req, res) => {
  try {
    const conversationId = req.params.id;
    const text = req.body.text || '';
    const imagePath = req.file ? req.file.path : undefined;
    const originalFilename = req.file ? req.file.originalname : undefined;
    const batchId = req.body.batchId || undefined;

    const result = await WhatsAppBotService.enqueueMessage(
      conversationId,
      text,
      imagePath,
      originalFilename,
      batchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Bulk Multi-image Batch Reception - accepts up to 50 images in a single call
 */
whatsappRouter.post('/conversations/:id/batch-messages', upload.array('images', 50), async (req, res) => {
  try {
    const conversationId = req.params.id;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'لم يتم إرفاق أي صور' });
    }

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'المحادثة غير موجودة' });
    }

    // Create a dedicated batch for this multi-image burst
    const batch = await prisma.notificationBatch.create({
      data: {
        conversationId,
        direction: conversation.direction,
        status: 'PROCESSING',
        totalJobs: files.length
      }
    });

    const jobs: any[] = [];

    // Enqueue each image rapidly
    for (const file of files) {
      const userMessage = await prisma.chatMessage.create({
        data: {
          conversationId,
          sender: 'USER',
          text: `📷 [إشعار تحويل بنكي: ${file.originalname}]`,
          mediaUrl: file.path
        }
      });

      const queueRes = await NotificationQueueService.enqueueJob({
        conversationId,
        direction: conversation.direction as 'INWARD' | 'OUTWARD',
        imagePath: file.path,
        originalFilename: file.originalname,
        batchId: batch.id,
        userMessageId: userMessage.id
      });

      jobs.push(queueRes);
    }

    res.json({
      success: true,
      data: {
        batchId: batch.id,
        totalReceived: files.length,
        jobs
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Check live status and progress of a notification batch
 */
whatsappRouter.get('/batches/:batchId/status', async (req, res) => {
  try {
    const status = await NotificationQueueService.getBatchStatus(req.params.batchId);
    if (!status) {
      return res.status(404).json({ success: false, error: 'الدفعة غير موجودة' });
    }
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Retry a failed or needs-review notification job
 */
whatsappRouter.post('/jobs/:jobId/retry', async (req, res) => {
  try {
    const result = await NotificationQueueService.retryJob(req.params.jobId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

