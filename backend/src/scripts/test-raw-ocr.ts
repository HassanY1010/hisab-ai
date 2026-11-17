import path from 'path';
import { createWorker } from 'tesseract.js';

async function testRaw() {
  const samplesDir = path.resolve(__dirname, '../../../sample-data/bank-notifications');
  const worker = await createWorker('ara+eng');
  const res = await worker.recognize(path.join(samplesDir, '1794831071578.jpg'));
  console.log('--- DIRECT RECOGNIZE ---');
  console.log(res.data.text);
  await worker.terminate();
}
testRaw();
