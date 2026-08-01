// Channel grant + user DMs, driven through the admin approve/reject callbacks.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, callbackUpdate, user, type OutgoingCall } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');
const { State } = await import('../src/bot/flows/state.js');

const ADMIN = 111;
const VIP = '-1001000000001'; // from test/setup.ts

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  return { bot, calls: recordOutgoing(bot) };
}

function seedPending(uid: bigint): string {
  fakePrisma.botUser.create({ data: { id: uid, name: 'Client', phone: '+1', onboardedAt: new Date() } });
  fakePrisma.funnelSession.create({ data: { userId: uid, state: State.PendingAdmin, broker: 'exness', identifier: 'me@x.com' } });
  const v = fakePrisma.verification.create({
    data: { userId: uid, broker: 'exness', identifier: 'me@x.com', found: true, eligible: true, status: 'pending_admin', screenshotFileId: 'S1', adminMessageId: 555 },
  });
  return v.id as string;
}

describe('approve → grant', () => {
  it('mints a single-use invite link, records it, DMs the user, resets session', async () => {
    const id = seedPending(300n);
    const { bot, calls } = boot();

    await bot.handleUpdate(callbackUpdate(`adm:approve:${id}`, user(ADMIN)));

    const invite = calls.find((c) => c.method === 'createChatInviteLink');
    expect(invite?.payload).toMatchObject({ chat_id: VIP, member_limit: 1 });
    expect(typeof invite?.payload.expire_date).toBe('number');

    const grant = fakePrisma.channelGrant.findFirst({ where: { userId: 300n } });
    expect(grant?.inviteLink).toContain('https://t.me/');

    const dm = calls.find((c) => c.method === 'sendMessage' && c.payload.chat_id === 300);
    expect(dm?.payload.text.toLowerCase()).toContain('approved');
    expect(dm?.payload.text).toContain(grant?.inviteLink);

    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 300n } })?.state).toBe(State.Idle);
  });
});

describe('reject → notify', () => {
  it('DMs a rejection without minting any link', async () => {
    const id = seedPending(301n);
    const { bot, calls } = boot();

    await bot.handleUpdate(callbackUpdate(`adm:reject:${id}`, user(ADMIN)));

    expect(calls.some((c) => c.method === 'createChatInviteLink')).toBe(false);
    expect(fakePrisma.channelGrant.count({ where: { userId: 301n } })).toBe(0);
    const dm = calls.find((c) => c.method === 'sendMessage' && c.payload.chat_id === 301);
    expect(dm?.payload.text.toLowerCase()).toContain('not approved');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 301n } })?.state).toBe(State.Idle);
  });
});
