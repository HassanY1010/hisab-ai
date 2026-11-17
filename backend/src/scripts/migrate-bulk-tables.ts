import { prisma } from '../services/db';

async function migrate() {
  console.log('[Migration] Applying Bulk Notification Processing database schema updates...');

  const commands = [
    `CREATE TABLE IF NOT EXISTS "NotificationBatch" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "conversationId" TEXT NOT NULL,
        "direction" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PROCESSING',
        "totalJobs" INTEGER NOT NULL DEFAULT 0,
        "registeredCount" INTEGER NOT NULL DEFAULT 0,
        "duplicateCount" INTEGER NOT NULL DEFAULT 0,
        "reviewCount" INTEGER NOT NULL DEFAULT 0,
        "failedCount" INTEGER NOT NULL DEFAULT 0,
        "totalAmount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
        "summaryMessageId" TEXT,
        "summarySent" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3)
    )`,
    `CREATE INDEX IF NOT EXISTS "NotificationBatch_conversationId_idx" ON "NotificationBatch"("conversationId")`,
    `CREATE INDEX IF NOT EXISTS "NotificationBatch_status_idx" ON "NotificationBatch"("status")`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "batchId" TEXT`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "conversationId" TEXT`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "direction" TEXT DEFAULT 'INWARD'`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "originalFilename" TEXT`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER NOT NULL DEFAULT 3`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "extractedTxNumber" TEXT`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "extractedAmount" NUMERIC(15, 2)`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "transactionId" TEXT`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "userMessageId" TEXT`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "botMessageId" TEXT`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3)`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3)`,
    `ALTER TABLE "ImageProcessingJob" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    `CREATE INDEX IF NOT EXISTS "ImageProcessingJob_status_idx" ON "ImageProcessingJob"("status")`,
    `CREATE INDEX IF NOT EXISTS "ImageProcessingJob_batchId_idx" ON "ImageProcessingJob"("batchId")`,
    `CREATE INDEX IF NOT EXISTS "ImageProcessingJob_conversationId_idx" ON "ImageProcessingJob"("conversationId")`,
    `CREATE INDEX IF NOT EXISTS "ImageProcessingJob_createdAt_idx" ON "ImageProcessingJob"("createdAt")`
  ];

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(`[Migration] [${i + 1}/${commands.length}] Running: ${cmd.substring(0, 50)}...`);
    await prisma.$executeRawUnsafe(cmd);
  }

  console.log('[Migration] Successfully executed all DDL statements!');

  const checkBatch: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "NotificationBatch"`);
  console.log('[Migration] NotificationBatch count:', checkBatch);

  const checkJob: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "ImageProcessingJob"`);
  console.log('[Migration] ImageProcessingJob count:', checkJob);

  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
