import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../src/lib/rate-limiter.js';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, textUpdate, user, type OutgoingCall } from './harness.js';

describe('RateLimiter (pure)', () => {
  it('allows up to max, warns once at max+1, then drops', () => {
    const rl = new RateLimiter(1000, 3);
    const t = 0;
    expect(rl.check(1, t)).toBe('ok');
    expect(rl.check(1, t)).toBe('ok');
    expect(rl.check(1, t)).toBe('ok');
    expect(rl.check(1, t)).toBe('limit');
    expect(rl.check(1, t)).toBe('over');
  });

  it('forgets hits older than the window', () => {
    const rl = new RateLimiter(1000, 1);
    expect(rl.check(9, 0)).toBe('ok');
    expect(rl.check(9, 500)).toBe('limit');
    expect(rl.check(9, 2000)).toBe('ok'); // window elapsed
  });

  it('tracks users independently', () => {
    const rl = new RateLimiter(1000, 1);
    expect(rl.check(1, 0)).toBe('ok');
    expect(rl.check(2, 0)).toBe('ok');
  });
});

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));
const { createBot } = await import('../src/bot/bot.js');

beforeEach(() => resetDb());

describe('rate-limit middleware (RATE_MAX=12 default)', () => {
  it('warns once and then drops a flood from one user', async () => {
    const bot = createBot('123:TEST', { botInfo: BOT_INFO });
    const calls: OutgoingCall[] = recordOutgoing(bot);
    const u = user(500);

    for (let i = 0; i < 15; i++) await bot.handleUpdate(textUpdate('/start', u));

    const slow = calls.filter((c) => c.method === 'sendMessage' && /going a bit fast/i.test(c.payload.text));
    expect(slow.length).toBe(1); // warned exactly once
    // Beyond the cap, /start intros stop being produced (updates dropped).
    const intros = calls.filter((c) => c.method === 'sendMessage' && /Start Verification|VIP Access/i.test(JSON.stringify(c.payload)));
    expect(intros.length).toBeLessThanOrEqual(12);
  });
});
