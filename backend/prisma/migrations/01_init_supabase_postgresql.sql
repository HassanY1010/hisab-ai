-- =====================================================================
-- HISAB AI: Supabase PostgreSQL Schema Migration
-- Designed for High Availability, Concurrency Safety & Financial Accuracy
-- =====================================================================

-- 1. Create Transaction Table
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionNumber" TEXT NOT NULL,
    "normalizedTxNumber" TEXT NOT NULL,
    "amount" NUMERIC(15, 2) NOT NULL,
    "direction" TEXT NOT NULL, -- 'INWARD' | 'OUTWARD'
    "senderAccount" TEXT,
    "receiverAccount" TEXT,
    "beneficiaryName" TEXT,
    "transactionDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagePath" TEXT,
    "storageKey" TEXT,
    "extractedText" TEXT,
    "rawOcrJson" TEXT,
    "ocrStatus" TEXT NOT NULL DEFAULT 'SUCCESS',
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "duplicateOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_transaction_duplicate_of" FOREIGN KEY ("duplicateOfId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Unique & Performance Indexes for Transaction
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_transactionNumber_key" ON "Transaction"("transactionNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_normalizedTxNumber_key" ON "Transaction"("normalizedTxNumber");
CREATE INDEX IF NOT EXISTS "Transaction_transactionNumber_idx" ON "Transaction"("transactionNumber");
CREATE INDEX IF NOT EXISTS "Transaction_normalizedTxNumber_idx" ON "Transaction"("normalizedTxNumber");
CREATE INDEX IF NOT EXISTS "Transaction_direction_idx" ON "Transaction"("direction");
CREATE INDEX IF NOT EXISTS "Transaction_receivedAt_idx" ON "Transaction"("receivedAt");

-- 2. Create Batch (Sessions / السير) Table
CREATE TABLE IF NOT EXISTS "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "direction" TEXT NOT NULL, -- 'INWARD' | 'OUTWARD'
    "status" TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' | 'CLOSED'
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "Batch_direction_idx" ON "Batch"("direction");
CREATE INDEX IF NOT EXISTS "Batch_status_idx" ON "Batch"("status");

-- 3. Create BatchTransaction Join Table
CREATE TABLE IF NOT EXISTS "BatchTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_batchtx_batch" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_batchtx_tx" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BatchTransaction_batchId_transactionId_key" ON "BatchTransaction"("batchId", "transactionId");

-- 4. Create DuplicateAttempt Table
CREATE TABLE IF NOT EXISTS "DuplicateAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionNumber" TEXT NOT NULL,
    "originalTransactionId" TEXT,
    "attemptedImagePath" TEXT,
    "storageKey" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extractedAmount" NUMERIC(15, 2),
    "reviewStatus" TEXT NOT NULL DEFAULT 'DETECTED',
    "notes" TEXT,
    CONSTRAINT "fk_duplicate_original_tx" FOREIGN KEY ("originalTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DuplicateAttempt_transactionNumber_idx" ON "DuplicateAttempt"("transactionNumber");
CREATE INDEX IF NOT EXISTS "DuplicateAttempt_attemptedAt_idx" ON "DuplicateAttempt"("attemptedAt");

-- 5. Create AuditLog Table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- 6. Create Conversation Table (WhatsApp Simulator)
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create ChatMessage Table
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "sender" TEXT NOT NULL, -- 'USER' | 'BOT' | 'SYSTEM'
    "text" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "storageKey" TEXT,
    "transactionId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_chatmsg_conversation" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_chatmsg_tx" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- 8. Create ImageProcessingJob Table
CREATE TABLE IF NOT EXISTS "ImageProcessingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imagePath" TEXT NOT NULL,
    "storageKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
