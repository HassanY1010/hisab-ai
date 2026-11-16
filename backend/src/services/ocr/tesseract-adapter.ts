import { createWorker, Worker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import { IOcrEngine, ParsedBankakReceipt } from './ocr-types';
import { ImagePreprocessor } from './ocr-preprocessor';
import { BankakReceiptParser } from './bankak-receipt-parser';

export class TesseractOcrAdapter implements IOcrEngine {
  public name = 'Tesseract.js OCR Adapter';
  public version = '5.1.0';
  private worker: Worker | null = null;
  private isInitializing = false;

  private async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker;
    while (this.isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (this.worker) return this.worker;
    }
    this.isInitializing = true;
    try {
      const candidatePaths = [
        path.resolve(__dirname, '../../..'),
        process.cwd(),
        path.resolve(process.cwd(), '..')
      ];
      const langPath = candidatePaths.find(p => fs.existsSync(path.join(p, 'ara.traineddata'))) || candidatePaths[0];

      this.worker = await createWorker(['eng', 'ara'], 1, {
        langPath,
        gzip: false
      });
      return this.worker;
    } finally {
      this.isInitializing = false;
    }
  }

  public async extractText(imagePath: string): Promise<{ text: string; confidence: number; preprocessedImagePath: string }> {
    const preprocessedPath = await ImagePreprocessor.preprocess(imagePath);
    const worker = await this.getWorker();
    const result = await worker.recognize(preprocessedPath);

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      preprocessedImagePath: preprocessedPath
    };
  }

  public async parseReceipt(imagePath: string): Promise<ParsedBankakReceipt> {
    const { text, confidence, preprocessedImagePath } = await this.extractText(imagePath);
    const parsed = BankakReceiptParser.parse(text, this.name, this.version);
    // If tesseract internal confidence is available, blend it
    if (parsed.status === 'SUCCESS' && confidence > 0) {
      parsed.confidence = Math.min(0.99, Number((confidence / 100).toFixed(2)));
    }
    return parsed;
  }

  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
