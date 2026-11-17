import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function withDbRetry<T>(fn: () => Promise<T>, retries = 5, delayMs = 1500): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isTransient = err.code === 'P1001' || err.code === 'P1017' ||
      err.message?.includes('closed the connection') ||
      err.message?.includes('Unable to start a transaction') ||
      err.message?.includes("Can't reach database server") ||
      err.message?.includes('Timed out fetching a new connection') ||
      err.message?.includes('Transaction not found');
    if (retries > 0 && isTransient) {
      await new Promise(r => setTimeout(r, delayMs));
      return await withDbRetry(fn, retries - 1, Math.min(delayMs * 1.5, 5000));
    }
    throw err;
  }
}
