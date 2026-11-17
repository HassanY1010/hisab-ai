import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.imageProcessingJob.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('Status counts:', JSON.stringify(counts, null, 2));

  const batches = await prisma.notificationBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, status: true, totalJobs: true, registeredCount: true, summarySent: true, createdAt: true }
  });
  console.log('Recent batches:', JSON.stringify(batches, null, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
