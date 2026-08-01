// Capstone: the entire funnel end-to-end, exactly as a real user + admin walk it.
// /start → name → phone → broker → email → check(pass) → contact → screenshot →
// admin card → admin approve → single-use VIP invite DM.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import {
  BOT_INFO,
  recordOutgoing,
  textUpdate,
  callbackUpdate,
  contactUpdate,
  photoUpdate,
  user,
  type OutgoingCall,
} from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');
const { State } = await import('../src/bot/flows/state.js');

const ADMIN = 111;

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  return { bot, calls: recordOutgoing(bot) };
}
const lastText = (calls: OutgoingCall[]): string =>
  [...calls].reverse().find((c) => c.method === 'sendMessage')?.payload?.text ?? '';

describe('full funnel end-to-end', () => {
  it('carries a new user from /start all the way to a VIP invite link', async () => {
    // Our referred client, eligible and freshly synced.
    fakePrisma.referredClient.create({ data: { broker: 'exness', identifier: 'alice@ex.com', deposits: 500, volumeLots: 1.2, syncedAt: new Date() } });
    const { bot, calls } = boot();
    const u = user(700);

    // Onboarding
    await bot.handleUpdate(textUpdate('/start', u));
    await bot.handleUpdate(callbackUpdate('start_verify', u));
    await bot.handleUpdate(textUpdate('Alice Smith', u));
    await bot.handleUpdate(textUpdate('+1 555 111 2222', u));
    expect(fakePrisma.botUser.findUnique({ where: { id: 700n } })?.onboardedAt).not.toBeNull();
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 700n } })?.state).toBe(State.Menu);

    // Broker + identifier → check passes
    await bot.handleUpdate(callbackUpdate('broker:exness', u));
    await bot.handleUpdate(textUpdate('alice@ex.com', u));
    expect(lastText(calls).toLowerCase()).toContain('verified');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 700n } })?.state).toBe(State.AwaitingContact);

    // Contact + screenshot → pending admin
    await bot.handleUpdate(contactUpdate('+15551112222', u));
    await bot.handleUpdate(photoUpdate('BALANCE_SHOT', u));
    const v = fakePrisma.verification.findFirst({ where: { userId: 700n } });
    expect(v?.status).toBe('pending_admin');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 700n } })?.state).toBe(State.PendingAdmin);

    // Admin approves
    await bot.handleUpdate(callbackUpdate(`adm:approve:${v!.id}`, user(ADMIN)));

    // Outcome: approved, invite minted + DM'd, session reset.
    expect(fakePrisma.verification.findUnique({ where: { id: v!.id as string } })?.status).toBe('approved');
    const grant = fakePrisma.channelGrant.findFirst({ where: { userId: 700n } });
    expect(grant?.inviteLink).toContain('https://t.me/');
    const dm = calls.find((c) => c.method === 'sendMessage' && c.payload.chat_id === 700 && /approved/i.test(c.payload.text));
    expect(dm?.payload.text).toContain(grant?.inviteLink);
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 700n } })?.state).toBe(State.Idle);
  });
});
