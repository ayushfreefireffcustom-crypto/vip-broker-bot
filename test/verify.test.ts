import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { checkEligibility } from '../src/verify/eligibility.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { verifyAccount } = await import('../src/verify/verifier.js');

beforeEach(() => resetDb());

const T = { minDeposit: 100, minVolume: 0.1 };

describe('checkEligibility', () => {
  it('passes when deposit and volume both meet the thresholds', () => {
    expect(checkEligibility({ deposits: 250, volumeLots: 0.5 }, T)).toEqual({ eligible: true, reasons: [] });
  });
  it('fails and explains a low deposit', () => {
    const r = checkEligibility({ deposits: 50, volumeLots: 1 }, T);
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toContain('deposit');
  });
  it('fails and explains a low / missing volume', () => {
    const r = checkEligibility({ deposits: 500, volumeLots: null }, T);
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toContain('volume');
  });
});

describe('verifyAccount', () => {
  it('found + eligible + fresh list → pass', async () => {
    fakePrisma.referredClient.create({ data: { broker: 'exness', identifier: 'me@x.com', deposits: 300, volumeLots: 0.4, syncedAt: new Date() } });
    const r = await verifyAccount('exness', 'ME@X.com');
    expect(r).toMatchObject({ found: true, eligible: true, stale: false, deposits: 300, volumeLots: 0.4 });
  });

  it('found but under-funded → not eligible, with a reason', async () => {
    fakePrisma.referredClient.create({ data: { broker: 'vantage', identifier: '12345', deposits: 20, volumeLots: 1, syncedAt: new Date() } });
    const r = await verifyAccount('vantage', '12345');
    expect(r.found).toBe(true);
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toContain('deposit');
    expect(r.stale).toBe(false);
  });

  it('not found but the list is fresh → confident not-found (not stale)', async () => {
    fakePrisma.referredClient.create({ data: { broker: 'xm', identifier: 'someoneelse', deposits: 500, volumeLots: 2, syncedAt: new Date() } });
    const r = await verifyAccount('xm', 'unknownuid');
    expect(r).toMatchObject({ found: false, eligible: false, stale: false });
  });

  it('not found and no list has ever synced → stale (route to manual)', async () => {
    const r = await verifyAccount('xm', 'anyuid');
    expect(r).toMatchObject({ found: false, stale: true });
  });

  it('found but the row is older than the stale window → stale', async () => {
    const old = new Date(Date.now() - 200 * 60_000); // 200 min > default 180
    fakePrisma.referredClient.create({ data: { broker: 'exness', identifier: 'old@x.com', deposits: 300, volumeLots: 1, syncedAt: old } });
    const r = await verifyAccount('exness', 'old@x.com');
    expect(r.found).toBe(true);
    expect(r.stale).toBe(true);
  });
});
