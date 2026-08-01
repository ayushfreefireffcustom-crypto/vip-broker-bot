// The "Checking…" step's four outcomes, end-to-end through the real bot.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, textUpdate, callbackUpdate, user, type OutgoingCall } from './harness.js';

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

async function pickAndSend(bot: ReturnType<typeof boot>['bot'], broker: string, id: string, u: ReturnType<typeof user>): Promise<void> {
  await bot.handleUpdate(callbackUpdate(`broker:${broker}`, u));
  await bot.handleUpdate(textUpdate(id, u));
}

describe('checking outcomes', () => {
  it('PASS: found + eligible + fresh → Verified + contact button, awaiting contact', async () => {
    fakePrisma.referredClient.create({ data: { broker: 'exness', identifier: 'me@x.com', deposits: 300, volumeLots: 0.5, syncedAt: new Date() } });
    const { bot, calls } = boot();
    const u = user(90);
    await pickAndSend(bot, 'exness', 'me@x.com', u);

    const send = lastSend(calls)!;
    expect(send.payload.text.toLowerCase()).toContain('verified');
    expect(JSON.stringify(send.payload.reply_markup)).toContain('request_contact');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 90n } })?.state).toBe(State.AwaitingContact);
  });

  it('NOT-LINKED: fresh list, id absent → referral guidance, stays at identifier', async () => {
    // Fresh list for vantage (a different client) so "not found" is confident.
    fakePrisma.referredClient.create({ data: { broker: 'vantage', identifier: '111222', deposits: 500, volumeLots: 2, syncedAt: new Date() } });
    const { bot, calls } = boot();
    const u = user(91);
    await pickAndSend(bot, 'vantage', '999888', u);

    expect(lastSend(calls)!.payload.text.toLowerCase()).toContain("couldn't find");
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 91n } })?.state).toBe(State.AwaitingIdentifier);
  });

  it('INELIGIBLE: found but under-funded → requirements, stays at identifier', async () => {
    fakePrisma.referredClient.create({ data: { broker: 'exness', identifier: 'poor@x.com', deposits: 10, volumeLots: 2, syncedAt: new Date() } });
    const { bot, calls } = boot();
    const u = user(92);
    await pickAndSend(bot, 'exness', 'poor@x.com', u);

    expect(lastSend(calls)!.payload.text.toLowerCase()).toContain('requirements');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 92n } })?.state).toBe(State.AwaitingIdentifier);
  });

  it('MANUAL: no synced list → stale → manual review + contact button, awaiting contact', async () => {
    const { bot, calls } = boot();
    const u = user(93);
    await pickAndSend(bot, 'xm', 'someuid', u);

    const send = lastSend(calls)!;
    expect(send.payload.text.toLowerCase()).toContain('manually');
    expect(JSON.stringify(send.payload.reply_markup)).toContain('request_contact');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 93n } })?.state).toBe(State.AwaitingContact);
  });
});
