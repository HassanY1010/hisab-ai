import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

async function testOcr() {
  const samplesDir = path.resolve(__dirname, '../../../sample-data/bank-notifications');
  const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

  console.log(`Found ${files.length} sample files in ${samplesDir}`);

  // Test with first image
  const file = files[0];
  const filePath = path.join(samplesDir, file);
  console.log(`Testing with file: ${file}`);

  const metadata = await sharp(filePath).metadata();
  console.log(`Dimensions: ${metadata.width}x${metadata.height}`);

  // Preprocess: Grayscale + Negate (to get dark text on light background) + Normalize + Threshold
  const preprocessedPath = path.resolve(__dirname, `../../test-preprocessed.png`);
  await sharp(filePath)
    .grayscale()
    .negate() // white text on green becomes dark text on light
    .normalize()
    .sharpen()
    .toFile(preprocessedPath);

  console.log('Saved preprocessed image to:', preprocessedPath);

  console.log('Initializing Tesseract worker (eng + ara)...');
  const worker = await createWorker(['eng', 'ara']);

  console.log('Running OCR on preprocessed image...');
  const ret = await worker.recognize(preprocessedPath);
  console.log('--- OCR Result text ---');
  console.log(ret.data.text);
  console.log('------------------------');

  await worker.terminate();
}

testOcr().catch(console.error);
