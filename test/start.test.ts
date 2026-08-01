// /start branching + first-time detection, against the real assembled bot.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, textUpdate, callbackUpdate, user, type OutgoingCall } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');
const { State } = await import('../src/bot/flows/state.js');

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  const calls = recordOutgoing(bot);
  return { bot, calls };
}

describe('/start', () => {
  it('shows the intro + Start Verification button to a new user', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(textUpdate('/start', user(42)));

    expect(calls[0]!.method).toBe('sendMessage');
    expect(JSON.stringify(calls[0]!.payload.reply_markup)).toContain('start_verify');
    // Idle == the default, so no session row is forced (absence of a row is Idle).
    const s = fakePrisma.funnelSession.findUnique({ where: { userId: 42n } });
    expect(s?.state ?? State.Idle).toBe(State.Idle);
  });

  it('start_verify begins onboarding by asking for the name', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(callbackUpdate('start_verify', user(42)));

    expect(calls.map((c) => c.method)).toContain('answerCallbackQuery');
    const send = calls.find((c) => c.method === 'sendMessage');
    expect(send?.payload.text.toLowerCase()).toContain('name');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 42n } })?.state).toBe(State.OnboardingName);
  });

  it('sends a returning onboarded user straight to the broker menu', async () => {
    fakePrisma.botUser.create({ data: { id: 7n, name: 'Prior', phone: '+1', onboardedAt: new Date() } });
    const { bot, calls } = boot();
    await bot.handleUpdate(textUpdate('/start', user(7)));

    const send = calls.find((c) => c.method === 'sendMessage');
    expect(send?.payload.text.toLowerCase()).toContain('broker');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 7n } })?.state).toBe(State.Menu);
  });
});
