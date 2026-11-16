import { Router } from 'express';
import { upload } from '../middlewares/upload';
import { TesseractOcrAdapter } from '../services/ocr/tesseract-adapter';
import { TransactionService } from '../services/transaction-service';
import { SupabaseStorageService } from '../services/storage/supabase-storage';
import fs from 'fs';

export const ocrRouter = Router();
const ocrAdapter = new TesseractOcrAdapter();

// Single receipt upload
ocrRouter.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'لم يتم إرفاق أي صورة.' });
    }

    const imagePath = req.file.path;
    const direction = (req.body.direction as 'INWARD' | 'OUTWARD') || 'INWARD';
    const autoCommit = req.body.commit === 'true' || req.body.commit === true;

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(imagePath);
    const storageRes = await SupabaseStorageService.uploadReceipt(fileBuffer, req.file.originalname, req.file.mimetype);

    // Run OCR
    const parsed = await ocrAdapter.parseReceipt(imagePath);

    let registrationResult = null;
    if (autoCommit && parsed.normalizedTxNumber && parsed.amount) {
      registrationResult = await TransactionService.registerTransaction({
        transactionNumber: parsed.normalizedTxNumber,
        amount: parsed.amount,
        direction,
        senderAccount: parsed.senderAccount || undefined,
        receiverAccount: parsed.receiverAccount || undefined,
        beneficiaryName: parsed.beneficiaryName || undefined,
        transactionDate: parsed.transactionDate || undefined,
        imagePath: storageRes.url,
        storageKey: storageRes.storageKey,
        extractedText: parsed.rawText,
        ocrStatus: parsed.status,
        verificationStatus: 'VERIFIED'
      });
    }

    res.json({
      success: true,
      data: {
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          url: storageRes.url,
          storageKey: storageRes.storageKey,
          isRemote: storageRes.isRemote
        },
        ocr: parsed,
        registration: registrationResult
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Batch / Multiple receipt upload
ocrRouter.post('/batch-upload', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'لم يتم إرفاق أي صور.' });
    }

    const direction = (req.body.direction as 'INWARD' | 'OUTWARD') || 'INWARD';
    const autoCommit = req.body.commit === 'true' || req.body.commit === true;

    const results = [];

    for (const file of files) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const storageRes = await SupabaseStorageService.uploadReceipt(fileBuffer, file.originalname, file.mimetype);
        const parsed = await ocrAdapter.parseReceipt(file.path);

        let reg = null;
        if (autoCommit && parsed.normalizedTxNumber && parsed.amount) {
          reg = await TransactionService.registerTransaction({
            transactionNumber: parsed.normalizedTxNumber,
            amount: parsed.amount,
            direction,
            senderAccount: parsed.senderAccount || undefined,
            receiverAccount: parsed.receiverAccount || undefined,
            beneficiaryName: parsed.beneficiaryName || undefined,
            transactionDate: parsed.transactionDate || undefined,
            imagePath: storageRes.url,
            storageKey: storageRes.storageKey,
            extractedText: parsed.rawText,
            ocrStatus: parsed.status,
            verificationStatus: 'VERIFIED'
          });
        }

        results.push({
          filename: file.originalname,
          success: true,
          url: storageRes.url,
          storageKey: storageRes.storageKey,
          ocr: parsed,
          registration: reg
        });
      } catch (err: any) {
        results.push({
          filename: file.originalname,
          success: false,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalReceived: files.length,
        processed: results.length,
        results
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
