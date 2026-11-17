import { prisma, withDbRetry } from './db';
import { TransactionService } from './transaction-service';
import { TesseractOcrAdapter } from './ocr/tesseract-adapter';
import { SupabaseStorageService } from './storage/supabase-storage';
import { WhatsAppResponseFormatter, BatchTableRow } from './whatsapp-response-formatter';
import { ReceiptDateParser } from './ocr/receipt-date-parser';
import fs from 'fs';
import path from 'path';

export { withDbRetry };

export interface EnqueueJobInput {
  conversationId: string;
  direction: 'INWARD' | 'OUTWARD';
  imagePath: string;
  storageKey?: string;
  originalFilename?: string;
  batchId?: string;
  userMessageId?: string;
}

export class NotificationQueueService {
  private static ocrAdapter = new TesseractOcrAdapter();
  private static concurrencyLimit = parseInt(process.env.NOTIFICATION_QUEUE_CONCURRENCY || '3', 10);
  private static activeWorkers = 0;
  private static memoryQueue: string[] = []; // Job IDs
  private static isInitialized = false;
  private static batchDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private static activeBurstBatches: Map<string, { batchId: string; lastSeen: number }> = new Map();

  /**
   * Initializes queue, recovers dangling jobs from server restart, and boots workers
   */
  public static async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      console.log(`[Queue] Initializing NotificationQueueService with concurrency=${this.concurrencyLimit}...`);

      // 1. Recover any jobs that were stuck in 'PROCESSING' due to server crash/restart
      const recovered = await prisma.imageProcessingJob.updateMany({
        where: { status: 'PROCESSING' },
        data: {
          status: 'QUEUED',
          errorMessage: 'تم استعادة المهمة بعد إعادة تشغيل الخادم'
        }
      });
      if (recovered.count > 0) {
        console.log(`[Queue] Recovered ${recovered.count} in-flight jobs after server restart.`);
      }

      // 2. Load all pending QUEUED jobs ordered by arrival time (FIFO)
      const pendingJobs = await prisma.imageProcessingJob.findMany({
        where: { status: 'QUEUED' },
        orderBy: { receivedAt: 'asc' },
        select: { id: true }
      });

      for (const job of pendingJobs) {
        if (!this.memoryQueue.includes(job.id)) {
          this.memoryQueue.push(job.id);
        }
      }

      console.log(`[Queue] Loaded ${this.memoryQueue.length} pending jobs from database.`);
      this.triggerProcessing();
    } catch (err: any) {
      console.error('[Queue] Error during queue initialization:', err);
    }
  }

  /**
   * Resolves or creates an active burst batch for a conversation.
   * If an image arrives within 4 seconds of previous image in the same channel,
   * it is automatically bundled into the same batch.
   */
  public static async getOrCreateActiveBatch(conversationId: string, direction: 'INWARD' | 'OUTWARD'): Promise<string> {
    const now = Date.now();
    const burst = this.activeBurstBatches.get(conversationId);

    if (burst && (now - burst.lastSeen) < 4000) {
      burst.lastSeen = now;
      // Increment batch total
      await withDbRetry(() => prisma.notificationBatch.update({
        where: { id: burst.batchId },
        data: { totalJobs: { increment: 1 } }
      })).catch(() => {});
      return burst.batchId;
    }

    // Create a new batch
    const newBatch = await withDbRetry(() => prisma.notificationBatch.create({
      data: {
        conversationId,
        direction,
        status: 'PROCESSING',
        totalJobs: 1
      }
    }));

    this.activeBurstBatches.set(conversationId, { batchId: newBatch.id, lastSeen: now });
    return newBatch.id;
  }

  /**
   * Enqueues an image notification into the database and memory queue
   */
  public static async enqueueJob(input: EnqueueJobInput): Promise<{ jobId: string; batchId: string; status: string }> {
    if (!this.isInitialized) {
      await this.init();
    }

    const batchId = input.batchId || (await this.getOrCreateActiveBatch(input.conversationId, input.direction));

    // Ensure initial progress message exists if this batch has or will have multiple jobs
    try {
      const b = await prisma.notificationBatch.findUnique({
        where: { id: batchId },
        select: { id: true, totalJobs: true, summaryMessageId: true, conversationId: true, _count: { select: { jobs: true } } }
      });
      if (b && (b.totalJobs > 1 || b._count.jobs > 0) && !b.summaryMessageId) {
        const total = Math.max(b.totalJobs, b._count.jobs + 1);
        const progMsg = await prisma.chatMessage.create({
          data: {
            conversationId: b.conversationId,
            sender: 'BOT',
            text: WhatsAppResponseFormatter.formatBatchProgress(0, total),
            metadata: JSON.stringify({
              type: 'BATCH_PROGRESS',
              batchId: b.id,
              total,
              completed: 0
            })
          }
        });
        await prisma.notificationBatch.update({
          where: { id: b.id },
          data: { summaryMessageId: progMsg.id }
        });
      }
    } catch {}

    // Create persistent job record in PostgreSQL
    const job = await withDbRetry(() => prisma.imageProcessingJob.create({
      data: {
        batchId,
        conversationId: input.conversationId,
        direction: input.direction,
        imagePath: input.imagePath,
        storageKey: input.storageKey,
        originalFilename: input.originalFilename,
        userMessageId: input.userMessageId,
        status: 'QUEUED',
        attempts: 0,
        maxAttempts: 3
      }
    }));

    this.memoryQueue.push(job.id);
    this.triggerProcessing();

    return { jobId: job.id, batchId, status: 'QUEUED' };
  }

  /**
   * Triggers worker loop according to concurrency limit
   */
  private static triggerProcessing() {
    while (this.activeWorkers < this.concurrencyLimit && this.memoryQueue.length > 0) {
      const nextJobId = this.memoryQueue.shift();
      if (nextJobId) {
        this.activeWorkers++;
        this.processJob(nextJobId).finally(() => {
          this.activeWorkers--;
          this.triggerProcessing();
        });
      }
    }
  }

  /**
   * Processes a single notification job with atomic locking, retry policy, and idempotency
   */
  private static async processJob(jobId: string) {
    let currentJob: any = null;

    try {
      // 1. Atomic claim: transition from 'QUEUED' to 'PROCESSING'
      const updated = await prisma.imageProcessingJob.updateMany({
        where: { id: jobId, status: 'QUEUED' },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          attempts: { increment: 1 }
        }
      });

      if (updated.count === 0) {
        // Job was already claimed or cancelled
        return;
      }

      const job = await prisma.imageProcessingJob.findUnique({
        where: { id: jobId },
        include: { conversation: true }
      });

      if (!job) return;
      currentJob = job;

      // Determine if job belongs to a bulk batch (more than 1 job in batch)
      let isBulkBatch = false;
      if (job.batchId) {
        const batchInfo = await prisma.notificationBatch.findUnique({
          where: { id: job.batchId },
          select: { totalJobs: true, _count: { select: { jobs: true } } }
        });
        if (batchInfo && (batchInfo.totalJobs > 1 || batchInfo._count.jobs > 1)) {
          isBulkBatch = true;
        }
      }

      let mediaUrl = job.imagePath;
      let storageKey = job.storageKey || undefined;
      // 2. Upload to Supabase Storage if local file and not yet stored
      if (job.imagePath && fs.existsSync(job.imagePath) && !storageKey) {
        try {
          const buffer = fs.readFileSync(job.imagePath);
          const filename = job.originalFilename || `receipt_${job.id}.jpg`;
          const uploadRes = await SupabaseStorageService.uploadReceipt(buffer, filename);
          mediaUrl = uploadRes.url;
          storageKey = uploadRes.storageKey;
          await prisma.imageProcessingJob.update({
            where: { id: jobId },
            data: { imagePath: mediaUrl, storageKey }
          });
        } catch (uploadErr: any) {
          console.warn(`[Queue] Storage upload warning for job ${jobId}:`, uploadErr.message);
        }
      }

      // 3. OCR Engine execution (with remote download fallback)
      let localOcrPath = job.imagePath;
      if (localOcrPath.startsWith('http://') || localOcrPath.startsWith('https://')) {
        const tempDir = path.join(process.cwd(), 'temp');
        const tempPath = path.join(tempDir, `temp_${job.id}.jpg`);
        try {
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          if (!fs.existsSync(tempPath)) {
            const resp = await fetch(localOcrPath);
            if (resp.ok) {
              const buf = Buffer.from(await resp.arrayBuffer());
              fs.writeFileSync(tempPath, buf);
              localOcrPath = tempPath;
            }
          } else {
            localOcrPath = tempPath;
          }
        } catch (fetchErr: any) {
          console.warn(`[Queue] Could not download remote image for OCR: ${fetchErr.message}`);
        }
      }

      const parsed = await this.ocrAdapter.parseReceipt(localOcrPath);

      const hasMinimalText = Boolean(parsed.rawText && parsed.rawText.trim().length >= 15);

      if (!hasMinimalText || parsed.status === 'FAILED') {
        // Needs review / extraction failed
        let botMsgId: string | undefined = undefined;
        if (!isBulkBatch) {
          const replyText = WhatsAppResponseFormatter.formatExtractionFailed();
          const botMsg = await prisma.chatMessage.create({
            data: {
              conversationId: job.conversationId,
              sender: 'BOT',
              text: replyText
            }
          });
          botMsgId = botMsg.id;
        }

        await prisma.imageProcessingJob.update({
          where: { id: jobId },
          data: {
            status: 'NEEDS_REVIEW',
            extractedText: parsed.rawText || '',
            errorMessage: 'تعذر استخراج نصوص كافية من صورة الإشعار',
            botMessageId: botMsgId,
            completedAt: new Date()
          }
        });

        await this.handleBatchProgress(job.batchId);
        return;
      }

      if (!parsed.normalizedTxNumber || parsed.amount === null || parsed.amount <= 0) {
        // Incomplete extracted data
        let botMsgId: string | undefined = undefined;
        if (!isBulkBatch) {
          const replyText = WhatsAppResponseFormatter.formatIncompleteData({
            transactionNumber: parsed.normalizedTxNumber,
            amount: parsed.amount,
            dateStr: parsed.formattedDate,
            timeStr: parsed.formattedTime,
            reason: !parsed.normalizedTxNumber ? 'تعذر استخراج رقم العملية بدقة' : 'تعذر استخراج المبلغ المالي'
          });

          const botMsg = await prisma.chatMessage.create({
            data: {
              conversationId: job.conversationId,
              sender: 'BOT',
              text: replyText
            }
          });
          botMsgId = botMsg.id;
        }

        await prisma.imageProcessingJob.update({
          where: { id: jobId },
          data: {
            status: 'NEEDS_REVIEW',
            extractedText: parsed.rawText || '',
            extractedTxNumber: parsed.normalizedTxNumber || undefined,
            extractedAmount: parsed.amount || undefined,
            errorMessage: !parsed.normalizedTxNumber ? 'تعذر استخراج رقم العملية' : 'تعذر استخراج المبلغ المالي',
            botMessageId: botMsgId,
            completedAt: new Date()
          }
        });

        await this.handleBatchProgress(job.batchId);
        return;
      }

      // 4. Register Transaction with strict deduplication & concurrency safety
      const regResult = await TransactionService.registerTransaction({
        transactionNumber: parsed.normalizedTxNumber,
        amount: parsed.amount,
        direction: job.direction as 'INWARD' | 'OUTWARD',
        senderAccount: parsed.senderAccount || undefined,
        receiverAccount: parsed.receiverAccount || undefined,
        beneficiaryName: parsed.beneficiaryName || undefined,
        transactionDate: parsed.transactionDate || undefined,
        imagePath: mediaUrl,
        storageKey,
        extractedText: parsed.rawText,
        rawOcrJson: JSON.stringify(parsed),
        ocrStatus: parsed.status,
        verificationStatus: 'VERIFIED'
      });

      let botReplyText = '';
      let linkedTxId: string | undefined = undefined;
      let finalJobStatus: 'REGISTERED' | 'DUPLICATE' | 'FAILED' = 'REGISTERED';

      if (regResult.status === 'DUPLICATE') {
        finalJobStatus = 'DUPLICATE';
        const orig = regResult.duplicateDetails?.originalTransaction;
        const isMismatch = regResult.duplicateDetails?.amountMismatch;
        const origAmount = orig ? Number(orig.amount) : 0;
        const origDate = orig?.transactionDate
          ? ReceiptDateParser.formatDateStr(new Date(orig.transactionDate).getUTCFullYear(), new Date(orig.transactionDate).getUTCMonth() + 1, new Date(orig.transactionDate).getUTCDate())
          : parsed.formattedDate;

        if (!isBulkBatch) {
          botReplyText = WhatsAppResponseFormatter.formatDuplicate({
            transactionNumber: parsed.normalizedTxNumber,
            amount: parsed.amount,
            dateStr: origDate || parsed.formattedDate,
            originalAmount: origAmount,
            amountMismatch: isMismatch
          });
        }
        linkedTxId = orig?.id;
      } else if (regResult.status === 'SUCCESS') {
        finalJobStatus = 'REGISTERED';
        linkedTxId = regResult.transaction?.id;

        if (!isBulkBatch) {
          // Single Mode: Fetch real-time financial stats and include running totals
          const stats = await TransactionService.getFinancialStats();
          botReplyText = WhatsAppResponseFormatter.formatSuccess({
            transactionNumber: parsed.normalizedTxNumber,
            amount: parsed.amount,
            direction: job.direction as 'INWARD' | 'OUTWARD',
            dateStr: parsed.formattedDate,
            timeStr: parsed.formattedTime,
            beneficiaryName: parsed.beneficiaryName,
            receiverAccount: parsed.receiverAccount,
            senderAccount: parsed.senderAccount,
            stats: {
              totalInward: stats.totalInward,
              totalOutward: stats.totalOutward,
              netBalance: stats.netBalance,
              totalCount: stats.totalTransactions
            }
          });
        }
      } else {
        finalJobStatus = 'FAILED';
        if (!isBulkBatch) {
          botReplyText = WhatsAppResponseFormatter.formatFailure();
        }
      }

      // 5. Post Bot Response to Chat ONLY in Single Mode
      let botMsgId: string | undefined = undefined;
      if (!isBulkBatch && botReplyText) {
        const botMsg = await prisma.chatMessage.create({
          data: {
            conversationId: job.conversationId,
            sender: 'BOT',
            text: botReplyText,
            transactionId: linkedTxId
          }
        });
        botMsgId = botMsg.id;
      }

      // 6. Finalize Job Status
      await prisma.imageProcessingJob.update({
        where: { id: jobId },
        data: {
          status: finalJobStatus,
          extractedText: parsed.rawText,
          extractedTxNumber: parsed.normalizedTxNumber,
          extractedAmount: parsed.amount,
          transactionId: linkedTxId,
          botMessageId: botMsgId,
          completedAt: new Date()
        }
      });

      await this.handleBatchProgress(job.batchId);

    } catch (err: any) {
      console.error(`[Queue] Error processing job ${jobId}:`, err.message);

      // Temporary database outage / network glitch (e.g. P1001)
      if (err.code === 'P1001' || (err.message && err.message.includes("Can't reach database server"))) {
        console.warn(`[Queue] Transient DB disconnect on job ${jobId}. Retrying with backoff in 2s...`);
        setTimeout(() => {
          this.memoryQueue.push(jobId);
          this.triggerProcessing();
        }, 2000);
        return;
      }

      const attempts = currentJob?.attempts || 1;
      const maxAttempts = currentJob?.maxAttempts || 3;

      // Retry policy for transient failures
      if (attempts < maxAttempts) {
        console.log(`[Queue] Scheduling retry for job ${jobId} (attempt ${attempts + 1}/${maxAttempts})...`);
        try {
          await prisma.imageProcessingJob.update({
            where: { id: jobId },
            data: {
              status: 'QUEUED',
              errorMessage: `خطأ مؤقت: ${err.message}`
            }
          });
        } catch {}
        setTimeout(() => {
          this.memoryQueue.push(jobId);
          this.triggerProcessing();
        }, 1500 * attempts); // Exponential backoff
      } else {
        // Exceeded retries -> Mark as FAILED
        try {
          await prisma.imageProcessingJob.update({
            where: { id: jobId },
            data: {
              status: 'FAILED',
              errorMessage: err.message,
              completedAt: new Date()
            }
          });
        } catch {}

        if (currentJob?.conversationId) {
          try {
            await prisma.chatMessage.create({
              data: {
                conversationId: currentJob.conversationId,
                sender: 'BOT',
                text: WhatsAppResponseFormatter.formatFailure()
              }
            });
          } catch {}
        }

        if (currentJob?.batchId) {
          await this.handleBatchProgress(currentJob.batchId);
        }
      }
    }
  }

  /**
   * Tracks batch progress and schedules the final batch summary once all jobs finish
   */
  private static async handleBatchProgress(batchId?: string | null) {
    if (!batchId) return;

    // Update live progress message in chat if batch is active
    try {
      const batch = await withDbRetry(() => prisma.notificationBatch.findUnique({
        where: { id: batchId },
        include: { jobs: true }
      }));

      if (batch && !batch.summarySent) {
        const completedCount = batch.jobs.filter(j => j.status !== 'QUEUED' && j.status !== 'PROCESSING').length;
        const total = Math.max(batch.totalJobs, batch.jobs.length);

        if (batch.summaryMessageId) {
          await withDbRetry(() => prisma.chatMessage.update({
            where: { id: batch.summaryMessageId! },
            data: {
              text: WhatsAppResponseFormatter.formatBatchProgress(completedCount, total),
              metadata: JSON.stringify({
                type: 'BATCH_PROGRESS',
                batchId: batch.id,
                total,
                completed: completedCount
              })
            }
          })).catch(() => {});
        }
      }
    } catch {}

    // Clear existing debounce timer if any
    const existingTimer = this.batchDebounceTimers.get(batchId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.batchDebounceTimers.delete(batchId);
    }

    // Set debounce timer (1.5 seconds). If no new jobs start in this batch, complete and emit summary!
    const timer = setTimeout(async () => {
      try {
        await this.finalizeBatchSummary(batchId);
      } catch (err: any) {
        console.error(`[Queue] Failed to finalize batch summary for ${batchId}:`, err);
        // Reset status to PROCESSING so it can be retried
        await withDbRetry(() => prisma.notificationBatch.updateMany({
          where: { id: batchId, status: 'FINALIZING' },
          data: { status: 'PROCESSING' }
        })).catch(() => {});
      } finally {
        this.batchDebounceTimers.delete(batchId);
      }
    }, 1500);

    this.batchDebounceTimers.set(batchId, timer);
  }

  /**
   * Computes actual database statistics for the batch and sends the official WhatsApp Batch Summary Table
   */
  private static async finalizeBatchSummary(batchId: string) {
    const batch = await withDbRetry(() => prisma.notificationBatch.findUnique({
      where: { id: batchId },
      include: {
        jobs: {
          include: { transaction: true },
          orderBy: { receivedAt: 'asc' }
        }
      }
    }));

    if (!batch || batch.summarySent || batch.jobs.length === 0) return;

    // Check if all jobs in the batch have completed
    const pendingCount = batch.jobs.filter(j => j.status === 'QUEUED' || j.status === 'PROCESSING').length;
    if (batch.jobs.length < batch.totalJobs || pendingCount > 0) {
      // Some jobs are still running or not all jobs loaded, do not emit summary yet!
      return;
    }

    // Atomic lock: transition status to FINALIZING so only one worker ever builds and sends the summary
    const claimed = await withDbRetry(() => prisma.notificationBatch.updateMany({
      where: { id: batchId, status: 'PROCESSING', summarySent: false },
      data: { status: 'FINALIZING' }
    }));
    if (claimed.count === 0) return;

    // Only emit batch summary if batch had 2 or more receipts (or if single multi-upload batch)
    if (batch.jobs.length < 2) {
      // Single notification already has its own comprehensive success response
      await withDbRetry(() => prisma.notificationBatch.update({
        where: { id: batchId },
        data: { status: 'COMPLETED', completedAt: new Date() }
      }));
      return;
    }

    // Calculate real database numbers
    const totalReceived = batch.jobs.length;
    const registeredJobs = batch.jobs.filter(j => j.status === 'REGISTERED');
    const duplicateCount = batch.jobs.filter(j => j.status === 'DUPLICATE').length;
    const reviewCount = batch.jobs.filter(j => j.status === 'NEEDS_REVIEW').length;
    const failedCount = batch.jobs.filter(j => j.status === 'FAILED').length;

    let totalAmount = 0;
    const tableRows: BatchTableRow[] = [];

    for (let i = 0; i < registeredJobs.length; i++) {
      const job = registeredJobs[i];
      if (job.transaction) {
        const amt = Number(job.transaction.amount);
        totalAmount += amt;
        const name = (job.transaction.beneficiaryName && job.transaction.beneficiaryName.trim().length > 1)
          ? job.transaction.beneficiaryName.trim()
          : 'غير متوفر';

        tableRows.push({
          index: i + 1,
          name,
          txNumber: job.transaction.transactionNumber,
          amount: amt
        });
      }
    }

    // Format the official Batch Summary Table matching reference image layout
    const summaryText = WhatsAppResponseFormatter.formatBatchReceiptsTable({
      batchId: batch.id,
      totalReceived,
      rows: tableRows,
      totalAmount,
      duplicateCount,
      reviewCount,
      failedCount
    });

    let summaryMsgId = batch.summaryMessageId;
    if (summaryMsgId) {
      // Transform progress message in place into official batch table summary
      await withDbRetry(() => prisma.chatMessage.update({
        where: { id: summaryMsgId! },
        data: {
          text: summaryText,
          metadata: JSON.stringify({
            type: 'BATCH_TABLE_SUMMARY',
            batchId: batch.id,
            totalReceived,
            registeredCount: tableRows.length,
            totalAmount,
            duplicateCount,
            reviewCount,
            failedCount,
            rows: tableRows
          })
        }
      }));
    } else {
      const summaryMsg = await withDbRetry(() => prisma.chatMessage.create({
        data: {
          conversationId: batch.conversationId,
          sender: 'BOT',
          text: summaryText,
          metadata: JSON.stringify({
            type: 'BATCH_TABLE_SUMMARY',
            batchId: batch.id,
            totalReceived,
            registeredCount: tableRows.length,
            totalAmount,
            duplicateCount,
            reviewCount,
            failedCount,
            rows: tableRows
          })
        }
      }));
      summaryMsgId = summaryMsg.id;
    }

    // Mark Batch as COMPLETED
    await withDbRetry(() => prisma.notificationBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        registeredCount: tableRows.length,
        duplicateCount,
        reviewCount,
        failedCount,
        totalAmount,
        summarySent: true,
        summaryMessageId: summaryMsgId,
        completedAt: new Date()
      }
    }));

    console.log(`[Queue] Successfully generated and sent batch table summary for batch=${batchId} (${tableRows.length} registered, ${totalAmount.toLocaleString()} SDG, ${duplicateCount} duplicates).`);
  }

  /**
   * Retrieves status of a batch for live frontend polling
   */
  public static async getBatchStatus(batchId: string) {
    const batch = await prisma.notificationBatch.findUnique({
      where: { id: batchId },
      include: {
        jobs: {
          select: {
            id: true,
            status: true,
            originalFilename: true,
            extractedTxNumber: true,
            extractedAmount: true,
            attempts: true,
            errorMessage: true,
            receivedAt: true,
            completedAt: true
          },
          orderBy: { receivedAt: 'asc' }
        }
      }
    });

    if (!batch) return null;

    const completedJobs = batch.jobs.filter(j => j.status !== 'QUEUED' && j.status !== 'PROCESSING').length;

    return {
      id: batch.id,
      status: batch.status,
      totalJobs: batch.jobs.length,
      completedJobs,
      progressPercent: batch.jobs.length > 0 ? Math.round((completedJobs / batch.jobs.length) * 100) : 100,
      registeredCount: batch.jobs.filter(j => j.status === 'REGISTERED').length,
      duplicateCount: batch.jobs.filter(j => j.status === 'DUPLICATE').length,
      reviewCount: batch.jobs.filter(j => j.status === 'NEEDS_REVIEW').length,
      failedCount: batch.jobs.filter(j => j.status === 'FAILED').length,
      summarySent: batch.summarySent,
      jobs: batch.jobs
    };
  }

  /**
   * Retries a failed or needs-review job
   */
  public static async retryJob(jobId: string) {
    const job = await prisma.imageProcessingJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('المهمة غير موجودة');

    await prisma.imageProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'QUEUED',
        attempts: 0,
        errorMessage: null
      }
    });

    this.memoryQueue.push(job.id);
    this.triggerProcessing();
    return { success: true, message: 'تمت إعادة جدولة المهمة بنجاح' };
  }
}
