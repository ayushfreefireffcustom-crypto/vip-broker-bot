// The sync worker upserts a source's rows into referred_clients and skips a
// source that returns null (leaving the existing list intact).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import type { ClientListSource } from '../src/sync/source.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { runSync } = await import('../src/sync/worker.js');

beforeEach(() => resetDb());

function source(name: string, map: Record<string, Awaited<ReturnType<ClientListSource['fetch']>>>): ClientListSource {
  return { name, fetch: (broker) => Promise.resolve(map[broker] ?? null) };
}

describe('runSync', () => {
  it('upserts rows returned by a source and makes them verifiable', async () => {
    const src = source('test', {
      exness: [{ identifier: 'A@X.com', deposits: 300, volumeLots: 1 }],
    });
    const outcome = await runSync({ exness: src, vantage: src, xm: src });

    expect(outcome.exness).toBe(1);
    // Identifier is normalized on write, so a fresh lookup matches.
    const row = fakePrisma.referredClient.findUnique({ where: { broker_identifier: { broker: 'exness', identifier: 'a@x.com' } } });
    expect(row?.deposits).toBe(300);
  });

  it('skips a broker whose source returns null (list untouched)', async () => {
    fakePrisma.referredClient.create({ data: { broker: 'vantage', identifier: 'keep', deposits: 1, volumeLots: 1, syncedAt: new Date() } });
    const src = source('test', {}); // returns null for every broker

    const outcome = await runSync({ vantage: src, exness: src, xm: src });

    expect(outcome.vantage).toBe(-1);
    // The pre-existing row is still there.
    expect(fakePrisma.referredClient.count({ where: { broker: 'vantage' } })).toBe(1);
  });

  it('re-running updates deposits/volume for the same identifier (no duplicates)', async () => {
    const first = source('t', { xm: [{ identifier: 'u1', deposits: 100, volumeLots: 0.1 }] });
    const second = source('t', { xm: [{ identifier: 'u1', deposits: 900, volumeLots: 5 }] });

    await runSync({ xm: first, vantage: first, exness: first });
    await runSync({ xm: second, vantage: second, exness: second });

    expect(fakePrisma.referredClient.count({ where: { broker: 'xm' } })).toBe(1);
    const row = fakePrisma.referredClient.findUnique({ where: { broker_identifier: { broker: 'xm', identifier: 'u1' } } });
    expect(row?.deposits).toBe(900);
  });
});
