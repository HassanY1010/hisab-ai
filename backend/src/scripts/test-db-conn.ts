import { prisma, withDbRetry } from '../services/db';

async function test() {
  console.log('Testing imageProcessingJob query...');
  const start = Date.now();
  try {
    const jobs = await withDbRetry(() => prisma.imageProcessingJob.findMany({ take: 5 }));
    console.log(`Found ${jobs.length} jobs in ${Date.now() - start} ms:`, jobs.map(j => ({ id: j.id, status: j.status })));
  } catch (err: any) {
    console.error('Query error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
