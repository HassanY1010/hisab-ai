import { Router } from 'express';
import { prisma } from '../services/db';
import { WhatsAppBotService } from '../services/whatsapp-bot-service';
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

whatsappRouter.post('/conversations/:id/messages', upload.single('image'), async (req, res) => {
  try {
    const conversationId = req.params.id;
    const text = req.body.text || '';
    const imagePath = req.file ? req.file.path : undefined;
    const originalFilename = req.file ? req.file.originalname : undefined;

    const result = await WhatsAppBotService.processMessage(
      conversationId,
      text,
      imagePath,
      undefined,
      originalFilename
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
