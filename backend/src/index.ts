import { app } from './app';
import { WhatsAppBotService } from './services/whatsapp-bot-service';
import { NotificationQueueService } from './services/notification-queue-service';

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await WhatsAppBotService.initDefaultConversations();
    await NotificationQueueService.init();
    app.listen(PORT, () => {
      console.log(`[HISAB AI Backend] Running on port ${PORT}`);
      console.log(`[HISAB AI Production URL] https://hisab-ai-production.up.railway.app`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
