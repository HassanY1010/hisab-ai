import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../services/db';

describe('HISAB AI Express API Endpoints', () => {
  beforeEach(async () => {
    await prisma.duplicateAttempt.deleteMany();
    await prisma.batchTransaction.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.transaction.deleteMany();
  });

  it('GET /api/dashboard/stats returns zero-state stats correctly', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats.totalInward).toBe(0);
    expect(res.body.data.stats.totalOutward).toBe(0);
    expect(res.body.data.stats.netBalance).toBe(0);
  });

  it('POST /api/transactions registers a transaction via API', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        transactionNumber: 'API-TX-101',
        amount: 2500000,
        direction: 'INWARD',
        beneficiaryName: 'أحمد محمد علي'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactionNumber).toBe('API-TX-101');
    expect(res.body.data.amount).toBe(2500000);
  });

  it('POST /api/transactions rejects duplicate transaction with 409 Conflict', async () => {
    // 1st time
    await request(app)
      .post('/api/transactions')
      .send({
        transactionNumber: 'DUP-TEST-202',
        amount: 1500000,
        direction: 'INWARD'
      });

    // 2nd time
    const resDup = await request(app)
      .post('/api/transactions')
      .send({
        transactionNumber: 'DUP-TEST-202',
        amount: 1500000,
        direction: 'INWARD'
      });

    expect(resDup.status).toBe(409);
    expect(resDup.body.duplicate).toBe(true);
  });

  it('GET /api/reports/excel streams a valid binary Excel file buffer', async () => {
    // Insert dummy tx
    await request(app)
      .post('/api/transactions')
      .send({
        transactionNumber: 'EXCEL-001',
        amount: 500000,
        direction: 'INWARD'
      });

    const res = await request(app).get('/api/reports/excel');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.body).toBeDefined();
  });
});
