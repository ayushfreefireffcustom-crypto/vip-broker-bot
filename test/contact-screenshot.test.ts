// Share-contact + screenshot capture → pending Verification.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, textUpdate, contactUpdate, photoUpdate, user, type OutgoingCall } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');
const { State } = await import('../src/bot/flows/state.js');

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  return { bot, calls: recordOutgoing(bot) };
}
const lastSend = (calls: OutgoingCall[]): OutgoingCall | undefined =>
  [...calls].reverse().find((c) => c.method === 'sendMessage');

function seedAt(state: string, id: bigint): void {
  fakePrisma.botUser.create({ data: { id, name: 'Test', phone: '+100', onboardedAt: new Date() } });
  fakePrisma.funnelSession.create({ data: { userId: id, state, broker: 'exness', identifier: 'me@x.com' } });
}

describe('contact + screenshot', () => {
  it('captures the shared contact and asks for a screenshot', async () => {
    seedAt(State.AwaitingContact, 100n);
    const { bot, calls } = boot();

    await bot.handleUpdate(contactUpdate('+15551230000', user(100)));

    const u = fakePrisma.botUser.findUnique({ where: { id: 100n } });
    expect(u?.contactShared).toBe(true);
    expect(u?.phone).toBe('+15551230000');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 100n } })?.state).toBe(State.AwaitingScreenshot);

    const send = lastSend(calls)!;
    expect(send.payload.text.toLowerCase()).toContain('screenshot');
    expect(send.payload.reply_markup).toMatchObject({ remove_keyboard: true });
  });

  it('stores the screenshot, creates a pending verification, and confirms', async () => {
    seedAt(State.AwaitingScreenshot, 101n);
    fakePrisma.referredClient.create({ data: { broker: 'exness', identifier: 'me@x.com', deposits: 300, volumeLots: 1, syncedAt: new Date() } });
    const { bot, calls } = boot();

    await bot.handleUpdate(photoUpdate('SCREEN1', user(101)));

    const s = fakePrisma.funnelSession.findUnique({ where: { userId: 101n } });
    expect(s?.screenshotFileId).toBe('SCREEN1');
    expect(s?.state).toBe(State.PendingAdmin);

    const v = fakePrisma.verification.findFirst({ where: { userId: 101n } });
    expect(v).toMatchObject({ status: 'pending_admin', screenshotFileId: 'SCREEN1', found: true, eligible: true });
    expect(lastSend(calls)!.payload.text.toLowerCase()).toContain('received');
  });

  it('nudges for a photo when a non-photo arrives at the screenshot step', async () => {
    seedAt(State.AwaitingScreenshot, 102n);
    const { bot, calls } = boot();

    await bot.handleUpdate(textUpdate('here is my balance', user(102)));

    expect(lastSend(calls)!.payload.text.toLowerCase()).toContain('photo');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 102n } })?.state).toBe(State.AwaitingScreenshot);
    expect(fakePrisma.verification.count({ where: { userId: 102n } })).toBe(0);
  });
});
