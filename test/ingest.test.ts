import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { detectBroker } from '../src/admin/ingest.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { ingestCsvText } = await import('../src/admin/ingest.js');

beforeEach(() => resetDb());

describe('detectBroker', () => {
  it('matches exact and prefixed file names', () => {
    expect(detectBroker('vantage.csv')).toBe('vantage');
    expect(detectBroker('Exness.csv')).toBe('exness');
    expect(detectBroker('xm_2026-08.csv')).toBe('xm');
  });
  it('returns null for unrecognized names', () => {
    expect(detectBroker('clients.csv')).toBeNull();
    expect(detectBroker('report.xlsx')).toBeNull();
  });
});

describe('ingestCsvText', () => {
  it('upserts parsed rows into referred_clients', async () => {
    const { count } = await ingestCsvText('vantage', 'uid,funded,lots\n445566,300,1.5\n778899,50,0.05\n');
    expect(count).toBe(2);
    const row = fakePrisma.referredClient.findUnique({ where: { broker_identifier: { broker: 'vantage', identifier: '445566' } } });
    expect(row?.deposits).toBe(300);
  });
});
