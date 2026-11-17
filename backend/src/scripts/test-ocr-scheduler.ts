import path from 'path';
import fs from 'fs';
import { createWorker, createScheduler } from 'tesseract.js';
import { ImagePreprocessor } from '../services/ocr/ocr-preprocessor';

async function benchmark() {
  const samplesDir = path.resolve(__dirname, '../../../sample-data/bank-notifications');
  const files = fs.readdirSync(samplesDir)
    .filter(f => !f.startsWith('preprocessed_') && (f.endsWith('.jpg') || f.endsWith('.png')))
    .sort();

  console.log(`Benchmarking OCR on ${files.length} sample images...`);

  // Preprocess all files first
  const preprocessed: string[] = [];
  for (const f of files) {
    const p = await ImagePreprocessor.preprocess(path.join(samplesDir, f));
    preprocessed.push(p);
  }

  const candidatePaths = [
    path.resolve(__dirname, '../../..'),
    process.cwd(),
    path.resolve(process.cwd(), '..')
  ];
  const langPath = candidatePaths.find(p => fs.existsSync(path.join(p, 'ara.traineddata'))) || candidatePaths[0];

  console.log(`Setting up scheduler with 2 workers...`);
  const scheduler = createScheduler();
  const w1 = await createWorker(['eng', 'ara'], 1, { langPath, gzip: false });
  const w2 = await createWorker(['eng', 'ara'], 1, { langPath, gzip: false });
  scheduler.addWorker(w1);
  scheduler.addWorker(w2);

  const start = Date.now();
  const jobs = preprocessed.map(p => scheduler.addJob('recognize', p));
  const results = await Promise.all(jobs);
  const totalMs = Date.now() - start;

  console.log(`Processed ${results.length} images in ${totalMs} ms (${(totalMs / results.length).toFixed(0)} ms/image)`);
  console.log(`Throughput: ${( (results.length / (totalMs / 1000)) * 60 ).toFixed(1)} receipts/min`);

  await scheduler.terminate();

  // Cleanup
  for (const p of preprocessed) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

benchmark().catch(console.error);
