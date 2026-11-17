import { createWorker, createScheduler, Scheduler } from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import { IOcrEngine, ParsedBankakReceipt } from './ocr-types';
import { ImagePreprocessor } from './ocr-preprocessor';
import { BankakReceiptParser } from './bankak-receipt-parser';

export class TesseractOcrAdapter implements IOcrEngine {
  public name = 'Tesseract.js OCR Adapter';
  public version = '5.1.0';
  private static instance: TesseractOcrAdapter | null = null;
  private scheduler: Scheduler | null = null;
  private isInitializing = false;
  private workerCount = 2; // Optimal 2 parallel workers on 4-thread CPU

  public static getInstance(): TesseractOcrAdapter {
    if (!TesseractOcrAdapter.instance) {
      TesseractOcrAdapter.instance = new TesseractOcrAdapter();
    }
    return TesseractOcrAdapter.instance;
  }

  private async getScheduler(): Promise<Scheduler> {
    if (this.scheduler) return this.scheduler;
    while (this.isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (this.scheduler) return this.scheduler;
    }
    this.isInitializing = true;
    try {
      const candidatePaths = [
        path.resolve(__dirname, '../../..'),
        process.cwd(),
        path.resolve(process.cwd(), '..')
      ];
      const langPath = candidatePaths.find(p => fs.existsSync(path.join(p, 'ara.traineddata'))) || candidatePaths[0];

      const sched = createScheduler();
      for (let i = 0; i < this.workerCount; i++) {
        const worker = await createWorker(['eng', 'ara'], 1, {
          langPath,
          gzip: false
        });
        sched.addWorker(worker);
      }
      this.scheduler = sched;
      return this.scheduler;
    } finally {
      this.isInitializing = false;
    }
  }

  public async extractText(imagePath: string, options?: any): Promise<{ text: string; confidence: number; preprocessedImagePath: string }> {
    const preprocessedPath = await ImagePreprocessor.preprocess(imagePath);
    try {
      const scheduler = await this.getScheduler();
      const result: any = await scheduler.addJob('recognize', preprocessedPath, options);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        preprocessedImagePath: preprocessedPath
      };
    } finally {
      // Safely delete intermediate preprocessed image file
      if (fs.existsSync(preprocessedPath)) {
        try {
          fs.unlinkSync(preprocessedPath);
        } catch {
          // Ignore unlink errors
        }
      }
    }
  }

  public async parseReceipt(imagePath: string): Promise<ParsedBankakReceipt> {
    const { text, confidence, preprocessedImagePath } = await this.extractText(imagePath);
    const parsed = BankakReceiptParser.parse(text, this.name, this.version);

    // If beneficiary name was missed in standard segmentation (e.g. table borders masking the name line),
    // perform a targeted sparse segmentation pass (PSM 11) to extract the name without degrading numbers/amounts.
    if (!parsed.beneficiaryName) {
      try {
        const sparseRes = await this.extractText(imagePath, { tessedit_pageseg_mode: '11' });
        if (sparseRes.text) {
          const sparseParsed = BankakReceiptParser.parse(sparseRes.text, this.name, this.version);
          if (sparseParsed.beneficiaryName) {
            parsed.beneficiaryName = sparseParsed.beneficiaryName;
            parsed.rawText = (parsed.rawText || '') + '\n' + sparseRes.text;
          }
        }
      } catch {
        // Fallback gracefully to original parsed receipt
      }
    }

    // If tesseract internal confidence is available, blend it
    if (parsed.status === 'SUCCESS' && confidence > 0) {
      parsed.confidence = Math.min(0.99, Number((confidence / 100).toFixed(2)));
    }
    return parsed;
  }

  public async terminate(): Promise<void> {
    if (this.scheduler) {
      await this.scheduler.terminate();
      this.scheduler = null;
    }
  }
}
