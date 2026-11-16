import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { prisma } from './services/db';
import { dashboardRouter } from './routes/dashboard';
import { transactionsRouter } from './routes/transactions';
import { batchesRouter } from './routes/batches';
import { duplicatesRouter } from './routes/duplicates';
import { reportsRouter } from './routes/reports';
import { ocrRouter } from './routes/ocr';
import { whatsappRouter } from './routes/whatsapp';
import { demoRouter } from './routes/demo';

export const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible media rendering and external assets in demo
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({
  origin: allowedOrigin === '*' ? true : allowedOrigin.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));

// Rate Limiting (Protects OCR and endpoints from denial of service)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة بعد قليل.' }
});
app.use('/api', apiLimiter);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static uploads (for local files)
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve sample bank notifications
const samplesDir = path.resolve(__dirname, '../../sample-data/bank-notifications');
app.use('/samples', express.static(samplesDir));

// Sample files listing API for convenient demoing
app.get('/api/samples', (_req, res) => {
  try {
    if (fs.existsSync(samplesDir)) {
      const files = fs.readdirSync(samplesDir).filter((f: string) => f.endsWith('.jpg') || f.endsWith('.png'));
      res.json({
        success: true,
        data: files.map((file: string) => ({
          filename: file,
          url: `/samples/${file}`
        }))
      });
    } else {
      res.json({ success: true, data: [] });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/duplicates', duplicatesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/ocr', ocrRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/demo', demoRouter);

// Liveness & Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'HISAB AI Accounting Bot',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Readiness Check (Checks database & storage health)
app.get('/api/ready', async (_req, res) => {
  try {
    // Ping Database
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      database: 'connected',
      storage: process.env.SUPABASE_URL ? 'supabase' : 'local',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Serve frontend dist when built
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/samples')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}
