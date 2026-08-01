// Admin Approve/Reject: auth gate, atomic decision, card edit.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, callbackUpdate, user, type OutgoingCall } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');

const ADMIN = 111; // from test/setup.ts ADMIN_IDS

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  return { bot, calls: recordOutgoing(bot) };
}

function seedPending(): string {
  fakePrisma.botUser.create({ data: { id: 200n, name: 'Client', phone: '+1', onboardedAt: new Date() } });
  const v = fakePrisma.verification.create({
    data: { userId: 200n, broker: 'exness', identifier: 'me@x.com', found: true, eligible: true, deposits: 300, volumeLots: 1, status: 'pending_admin', screenshotFileId: 'S1', adminMessageId: 555 },
  });
  return v.id as string;
}
const cbText = (calls: OutgoingCall[]): string =>
  calls.find((c) => c.method === 'answerCallbackQuery')?.payload?.text ?? '';

describe('admin decisions', () => {
  it('approves a pending case (status + card edit) for an admin', async () => {
    const id = seedPending();
    const { bot, calls } = boot();

    await bot.handleUpdate(callbackUpdate(`adm:approve:${id}`, user(ADMIN)));

    expect(cbText(calls)).toContain('Approved');
    expect(calls.some((c) => c.method === 'editMessageCaption')).toBe(true);
    const v = fakePrisma.verification.findUnique({ where: { id } });
    expect(v?.status).toBe('approved');
    expect(Number(v?.decidedBy)).toBe(ADMIN);
  });

  it('rejects a pending case for an admin', async () => {
    const id = seedPending();
    const { bot, calls } = boot();

    await bot.handleUpdate(callbackUpdate(`adm:reject:${id}`, user(ADMIN)));

    expect(cbText(calls)).toContain('Rejected');
    expect(fakePrisma.verification.findUnique({ where: { id } })?.status).toBe('rejected');
  });

  it('blocks a non-admin and leaves the case pending', async () => {
    const id = seedPending();
    const { bot, calls } = boot();

    await bot.handleUpdate(callbackUpdate(`adm:approve:${id}`, user(999)));

    expect(cbText(calls).toLowerCase()).toContain('not authorized');
    expect(fakePrisma.verification.findUnique({ where: { id } })?.status).toBe('pending_admin');
  });

  it('is idempotent — a second decision reports already handled', async () => {
    const id = seedPending();
    const { bot } = boot();

    await bot.handleUpdate(callbackUpdate(`adm:approve:${id}`, user(ADMIN)));
    const { bot: bot2, calls } = boot();
    await bot2.handleUpdate(callbackUpdate(`adm:reject:${id}`, user(ADMIN)));

    expect(cbText(calls).toLowerCase()).toContain('already handled');
    // Still approved from the first decision.
    expect(fakePrisma.verification.findUnique({ where: { id } })?.status).toBe('approved');
  });
});
