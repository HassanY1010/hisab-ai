import { PrismaClient } from '@prisma/client';

const pgbouncerUrl = 'postgresql://postgres.evpwtlbsrqqeeowiixwd:Hhaall112233hh@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const testPrisma = new PrismaClient({
  datasources: {
    db: { url: pgbouncerUrl }
  }
});

async function run() {
  console.log('Testing connection on port 6543 (Transaction mode)...');
  const count = await testPrisma.transaction.count();
  console.log('Port 6543 Success! Transaction count:', count);
  await testPrisma.$disconnect();
}

run().catch(console.error);
