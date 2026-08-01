// Submitting the screenshot posts a case card to the admin group.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, photoUpdate, user, type OutgoingCall } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');
const { State } = await import('../src/bot/flows/state.js');
const ADMIN_GROUP = '-1001000000002'; // from test/setup.ts

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  return { bot, calls: recordOutgoing(bot) };
}

describe('admin case card', () => {
  it('posts the screenshot + details + Approve/Reject to the admin group', async () => {
    fakePrisma.botUser.create({ data: { id: 110n, name: 'Jane Roe', phone: '+15550001111', username: 'jane', onboardedAt: new Date() } });
    fakePrisma.funnelSession.create({ data: { userId: 110n, state: State.AwaitingScreenshot, broker: 'vantage', identifier: '778899' } });
    fakePrisma.referredClient.create({ data: { broker: 'vantage', identifier: '778899', deposits: 500, volumeLots: 2, syncedAt: new Date() } });
    const { bot, calls } = boot();

    await bot.handleUpdate(photoUpdate('SHOT9', user(110)));

    const card = calls.find((c) => c.method === 'sendPhoto' && c.payload.chat_id === ADMIN_GROUP);
    expect(card).toBeDefined();
    expect(card!.payload.photo).toBe('SHOT9');
    expect(card!.payload.caption).toContain('Pending verification');
    expect(card!.payload.caption).toContain('778899');
    const kb = JSON.stringify(card!.payload.reply_markup);
    expect(kb).toContain('adm:approve:');
    expect(kb).toContain('adm:reject:');

    // The card's message id is recorded for later in-place editing.
    const v = fakePrisma.verification.findFirst({ where: { userId: 110n } });
    expect(v?.adminMessageId).not.toBeNull();
  });
});
