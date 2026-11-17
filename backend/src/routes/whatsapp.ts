import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma, withDbRetry } from '../services/db';
import { WhatsAppBotService } from '../services/whatsapp-bot-service';
import { WhatsAppResponseFormatter } from '../services/whatsapp-response-formatter';
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
    const conversationId = String(req.params.id);
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      include: { transaction: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
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
    const conversationId = String(req.params.id);
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
    const conversationId = String(req.params.id);
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

    // 1. Create ALL user messages first so they are guaranteed to appear first in chronological order
    const baseTime = Date.now();
    const createdUserMessages = await Promise.all(
      files.map(async (file, i) => {
        const publicUrl = `/uploads/${file.filename}`;
        const userMessage = await withDbRetry(() => prisma.chatMessage.create({
          data: {
            conversationId,
            sender: 'USER',
            text: `📷 [إشعار تحويل بنكي: ${file.originalname}]`,
            mediaUrl: publicUrl,
            createdAt: new Date(baseTime + i * 20)
          }
        }));
        return { file, userMessageId: userMessage.id };
      })
    );

    // 2. Create the temporary progress message strictly AFTER all user messages
    const progressMessage = await withDbRetry(() => prisma.chatMessage.create({
      data: {
        conversationId,
        sender: 'BOT',
        text: WhatsAppResponseFormatter.formatBatchProgress(0, files.length),
        metadata: JSON.stringify({
          type: 'BATCH_PROGRESS',
          batchId: batch.id,
          total: files.length,
          completed: 0
        }),
        createdAt: new Date(baseTime + files.length * 20 + 50)
      }
    }));

    await withDbRetry(() => prisma.notificationBatch.update({
      where: { id: batch.id },
      data: { summaryMessageId: progressMessage.id }
    }));

    // 3. Enqueue each image rapidly in parallel
    const jobs = await Promise.all(
      createdUserMessages.map(item =>
        NotificationQueueService.enqueueJob({
          conversationId,
          direction: conversation.direction as 'INWARD' | 'OUTWARD',
          imagePath: item.file.path,
          originalFilename: item.file.originalname,
          batchId: batch.id,
          userMessageId: item.userMessageId
        })
      )
    );

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

function getSamplesDirectory(): string {
  const candidates = [
    path.resolve(process.cwd(), 'sample-data/bank-notifications'),
    path.resolve(process.cwd(), '../sample-data/bank-notifications'),
    path.resolve(__dirname, '../../../sample-data/bank-notifications'),
    path.resolve(__dirname, '../../sample-data/bank-notifications'),
    path.resolve(__dirname, '../../../../sample-data/bank-notifications'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

/**
 * Instant Sample Launcher (Server-side Staging)
 * Allows sending sample receipts immediately without downloading/re-uploading large images over cellular network
 */
whatsappRouter.post('/conversations/:id/send-samples', async (req, res) => {
  try {
    const conversationId = String(req.params.id);
    const requestedFiles: string[] = req.body.filenames;

    const samplesDir = getSamplesDirectory();
    let targetFiles: string[] = [];

    if (Array.isArray(requestedFiles) && requestedFiles.length > 0) {
      targetFiles = requestedFiles.filter(f => fs.existsSync(path.join(samplesDir, f)));
    } else {
      targetFiles = fs.readdirSync(samplesDir)
        .filter(f => !f.startsWith('preprocessed_') && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')))
        .sort();
    }

    if (targetFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'لم يتم العثور على أي ملفات عينات صالحة' });
    }

    const conversation = await withDbRetry(() => prisma.conversation.findUnique({ where: { id: conversationId } }));
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'المحادثة غير موجودة' });
    }

    // 1. Create a dedicated batch for this multi-sample burst
    const batch = await withDbRetry(() => prisma.notificationBatch.create({
      data: {
        conversationId,
        direction: conversation.direction as 'INWARD' | 'OUTWARD',
        status: 'PROCESSING',
        totalJobs: targetFiles.length
      }
    }));

    // 2. Create ALL user messages first with public web URL (/samples/filename)
    const baseTime = Date.now();
    const createdUserMessages = await Promise.all(
      targetFiles.map(async (filename, i) => {
        const publicUrl = `/samples/${filename}`;
        const userMessage = await withDbRetry(() => prisma.chatMessage.create({
          data: {
            conversationId,
            sender: 'USER',
            text: `📷 [إشعار تحويل بنكي: ${filename}]`,
            mediaUrl: publicUrl,
            createdAt: new Date(baseTime + i * 20)
          }
        }));
        return { filename, userMessageId: userMessage.id };
      })
    );

    // 3. Create the temporary progress message strictly AFTER all user messages
    const progressMessage = await withDbRetry(() => prisma.chatMessage.create({
      data: {
        conversationId,
        sender: 'BOT',
        text: WhatsAppResponseFormatter.formatBatchProgress(0, targetFiles.length),
        metadata: JSON.stringify({
          type: 'BATCH_PROGRESS',
          batchId: batch.id,
          total: targetFiles.length,
          completed: 0
        }),
        createdAt: new Date(baseTime + targetFiles.length * 20 + 50)
      }
    }));

    await withDbRetry(() => prisma.notificationBatch.update({
      where: { id: batch.id },
      data: { summaryMessageId: progressMessage.id }
    }));

    // 4. Enqueue each image rapidly into the queue
    const jobs = await Promise.all(
      createdUserMessages.map(item =>
        NotificationQueueService.enqueueJob({
          conversationId,
          direction: conversation.direction as 'INWARD' | 'OUTWARD',
          imagePath: path.join(samplesDir, item.filename),
          originalFilename: item.filename,
          batchId: batch.id,
          userMessageId: item.userMessageId
        })
      )
    );

    res.json({
      success: true,
      data: {
        batchId: batch.id,
        totalReceived: targetFiles.length,
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
    const status = await NotificationQueueService.getBatchStatus(String(req.params.batchId));
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
    const result = await NotificationQueueService.retryJob(String(req.params.jobId));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

