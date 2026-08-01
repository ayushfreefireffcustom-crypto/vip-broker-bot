import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, textUpdate, user, type OutgoingCall } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');
const ADMIN = 111;

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  return { bot, calls: recordOutgoing(bot) };
}
const lastText = (calls: OutgoingCall[]): string =>
  [...calls].reverse().find((c) => c.method === 'sendMessage')?.payload?.text ?? '';

describe('/pending', () => {
  it('lists open cases for an admin', async () => {
    fakePrisma.botUser.create({ data: { id: 400n, onboardedAt: new Date() } });
    fakePrisma.verification.create({ data: { userId: 400n, broker: 'exness', identifier: 'a@x.com', status: 'pending_admin' } });
    fakePrisma.verification.create({ data: { userId: 400n, broker: 'vantage', identifier: '1234', status: 'pending_admin' } });
    const { bot, calls } = boot();

    await bot.handleUpdate(textUpdate('/pending', user(ADMIN)));
    expect(lastText(calls)).toContain('Pending (2)');
  });

  it('says none when empty', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(textUpdate('/pending', user(ADMIN)));
    expect(lastText(calls).toLowerCase()).toContain('no pending');
  });

  it('ignores a non-admin', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(textUpdate('/pending', user(999)));
    expect(calls.length).toBe(0);
  });
});

describe('/stats', () => {
  it('reports funnel counts and referred-list sizes for an admin', async () => {
    fakePrisma.botUser.create({ data: { id: 1n, onboardedAt: new Date() } });
    fakePrisma.botUser.create({ data: { id: 2n, onboardedAt: new Date() } });
    fakePrisma.botUser.create({ data: { id: 3n } }); // not onboarded
    fakePrisma.verification.create({ data: { userId: 1n, broker: 'exness', identifier: 'a', status: 'pending_admin' } });
    fakePrisma.verification.create({ data: { userId: 2n, broker: 'exness', identifier: 'b', status: 'approved' } });
    fakePrisma.referredClient.create({ data: { broker: 'exness', identifier: 'a', syncedAt: new Date() } });
    const { bot, calls } = boot();

    await bot.handleUpdate(textUpdate('/stats', user(ADMIN)));
    const text = lastText(calls);
    expect(text).toContain('Funnel stats');
    // 3 seeded + the admin (created by the session middleware on /stats) = 4.
    expect(text).toContain('users: 4 (onboarded 2)');
    expect(text).toContain('pending: 1');
    expect(text).toContain('approved: 1');
  });
});
