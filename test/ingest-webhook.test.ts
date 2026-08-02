// Webhook ingest: auth, broker validation, flexible payload parsing, upsert.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { parseIngestBody } from '../src/ingest/webhook.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { handleIngest } = await import('../src/ingest/webhook.js');
const TOKEN = 'test-ingest-token'; // from test/setup.ts

beforeEach(() => resetDb());

describe('parseIngestBody', () => {
  it('accepts a single object with aliased keys', () => {
    expect(parseIngestBody({ email: 'a@x.com', funded: '250', lots: 0.8 })).toEqual([
      { identifier: 'a@x.com', deposits: 250, volumeLots: 0.8 },
    ]);
  });
  it('accepts an array and skips rows without an identifier', () => {
    const rows = parseIngestBody([{ uid: '123', deposit: 100 }, { deposit: 5 }]);
    expect(rows).toEqual([{ identifier: '123', deposits: 100, volumeLots: null }]);
  });
});

describe('handleIngest', () => {
  it('rejects a bad token', async () => {
    const r = await handleIngest('exness', 'wrong', { email: 'a@x.com' });
    expect(r.status).toBe(401);
  });

  it('rejects an unknown broker', async () => {
    const r = await handleIngest('binance', TOKEN, { uid: '1' });
    expect(r.status).toBe(400);
  });

  it('rejects an empty payload', async () => {
    const r = await handleIngest('exness', TOKEN, {});
    expect(r.status).toBe(400);
  });

  it('upserts on a valid authorized post and makes the client verifiable', async () => {
    const r = await handleIngest('vantage', TOKEN, [{ uid: '778899', funded: 300, lots: 1.5 }]);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, broker: 'vantage', count: 1 });
    const row = fakePrisma.referredClient.findUnique({ where: { broker_identifier: { broker: 'vantage', identifier: '778899' } } });
    expect(row?.deposits).toBe(300);
  });
});
