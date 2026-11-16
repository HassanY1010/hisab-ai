import { Router } from 'express';
import { prisma } from '../services/db';
import { WhatsAppBotService } from '../services/whatsapp-bot-service';

export const demoRouter = Router();

demoRouter.post('/reset', async (_req, res) => {
  try {
    // Delete transactions and batches
    await prisma.batchTransaction.deleteMany();
    await prisma.duplicateAttempt.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.auditLog.deleteMany();

    // Re-initialize default WhatsApp channels
    await WhatsAppBotService.initDefaultConversations();

    await prisma.auditLog.create({
      data: {
        action: 'DEMO_DATA_RESET',
        entityType: 'System',
        details: JSON.stringify({ timestamp: new Date().toISOString() })
      }
    });

    res.json({
      success: true,
      message: 'تمت إعادة تهيئة بيانات العرض التجريبي بنجاح.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
