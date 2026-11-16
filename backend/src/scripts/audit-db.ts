import { prisma } from '../services/db';

async function check() {
  const txCount = await prisma.transaction.count();
  const batchCount = await prisma.batch.count();
  const dupCount = await prisma.duplicateAttempt.count();
  const convCount = await prisma.conversation.count();
  const msgCount = await prisma.chatMessage.count();
  const auditCount = await prisma.auditLog.count();
  console.log('SQLITE_DATA:', JSON.stringify({ txCount, batchCount, dupCount, convCount, msgCount, auditCount }));
  await prisma.$disconnect();
}

check().catch(console.error);
