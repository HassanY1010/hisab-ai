import { TesseractOcrAdapter } from '../services/ocr/tesseract-adapter';
import path from 'path';

async function main() {
  const a = new TesseractOcrAdapter();
  const imgPath = path.resolve(__dirname, '../../../sample-data/bank-notifications/1794831071700.jpg');
  const res = await a.extractText(imgPath);
  console.log('=== RAW TEXT FROM IMAGE 5 ===');
  console.log(res.text);
  console.log('=== END ===');
  await a.terminate();
}

main().catch(console.error);
