// Broker menu, per-broker identifier collection, and /cancel — against the real bot.
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
const lastText = (calls: OutgoingCall[]): string =>
  [...calls].reverse().find((c) => c.method === 'sendMessage' || c.method === 'sendPhoto')?.payload?.text ??
  [...calls].reverse().find((c) => c.method === 'sendMessage')?.payload?.text ??
  '';

describe('broker selection', () => {
  it('prompts for an email when Exness is picked', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(callbackUpdate('broker:exness', user(70)));

    expect(calls.map((c) => c.method)).toContain('answerCallbackQuery');
    expect(lastText(calls).toLowerCase()).toContain('email');
    const s = fakePrisma.funnelSession.findUnique({ where: { userId: 70n } });
    expect(s?.broker).toBe('exness');
    expect(s?.state).toBe(State.AwaitingIdentifier);
  });

  it('prompts for a UID when Vantage is picked', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(callbackUpdate('broker:vantage', user(71)));
    expect(lastText(calls).toLowerCase()).toContain('uid');
  });
});

describe('identifier collection', () => {
  it('accepts a valid Exness email (lowercased) and moves to checking', async () => {
    const { bot, calls } = boot();
    const u = user(72);
    await bot.handleUpdate(callbackUpdate('broker:exness', u));
    await bot.handleUpdate(textUpdate('Me@Example.COM', u));

    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 72n } })?.identifier).toBe('me@example.com');
    expect(lastText(calls).toLowerCase()).toContain('checking');
  });

  it('rejects an invalid email without storing it', async () => {
    const { bot, calls } = boot();
    const u = user(73);
    await bot.handleUpdate(callbackUpdate('broker:exness', u));
    await bot.handleUpdate(textUpdate('nope', u));

    expect(lastText(calls).toLowerCase()).toContain('valid email');
    const s = fakePrisma.funnelSession.findUnique({ where: { userId: 73n } });
    expect(s?.identifier ?? null).toBeNull();
    expect(s?.state).toBe(State.AwaitingIdentifier);
  });

  it('accepts a valid Vantage UID', async () => {
    const { bot } = boot();
    const u = user(74);
    await bot.handleUpdate(callbackUpdate('broker:vantage', u));
    await bot.handleUpdate(textUpdate('1234567', u));
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 74n } })?.identifier).toBe('1234567');
  });
});

describe('/cancel', () => {
  it('returns an onboarded user to the broker menu and clears the attempt', async () => {
    fakePrisma.botUser.create({ data: { id: 80n, name: 'A', phone: '+1', onboardedAt: new Date() } });
    fakePrisma.funnelSession.create({ data: { userId: 80n, state: State.AwaitingIdentifier, broker: 'exness', identifier: 'x@y.z' } });
    const { bot, calls } = boot();

    await bot.handleUpdate(textUpdate('/cancel', user(80)));

    expect(calls.some((c) => c.method === 'sendMessage' && /cancelled/i.test(c.payload.text))).toBe(true);
    const s = fakePrisma.funnelSession.findUnique({ where: { userId: 80n } });
    expect(s?.state).toBe(State.Menu);
    expect(s?.broker).toBeNull();
  });
});
