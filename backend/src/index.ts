import { app } from './app';
import { WhatsAppBotService } from './services/whatsapp-bot-service';

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await WhatsAppBotService.initDefaultConversations();
    app.listen(PORT, () => {
      console.log(`[HISAB AI Backend] Running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
