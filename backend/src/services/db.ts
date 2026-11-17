import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function withDbRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 600): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isTransient = err.code === 'P1001' || err.code === 'P1017' ||
      err.message?.includes('closed the connection') ||
      err.message?.includes('Unable to start a transaction') ||
      err.message?.includes("Can't reach database server");
    if (retries > 0 && isTransient) {
      await new Promise(r => setTimeout(r, delayMs));
      return await withDbRetry(fn, retries - 1, delayMs * 2);
    }
    throw err;
  }
}
