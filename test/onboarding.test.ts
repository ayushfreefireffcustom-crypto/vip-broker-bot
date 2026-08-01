// Onboarding capture flow against the real assembled bot.
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
  [...calls].reverse().find((c) => c.method === 'sendMessage')?.payload.text ?? '';

describe('onboarding', () => {
  it('captures name → phone and lands on the broker menu', async () => {
    const { bot, calls } = boot();
    const u = user(50);

    await bot.handleUpdate(callbackUpdate('start_verify', u));
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 50n } })?.state).toBe(State.OnboardingName);

    await bot.handleUpdate(textUpdate('John Doe', u));
    expect(fakePrisma.botUser.findUnique({ where: { id: 50n } })?.name).toBe('John Doe');
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 50n } })?.state).toBe(State.OnboardingPhone);

    await bot.handleUpdate(textUpdate('+1 555 123 4567', u));
    const dbUser = fakePrisma.botUser.findUnique({ where: { id: 50n } });
    expect(dbUser?.phone).toBe('+15551234567');
    expect(dbUser?.onboardedAt).not.toBeNull();
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 50n } })?.state).toBe(State.Menu);
    expect(lastText(calls).toLowerCase()).toContain('broker');
  });

  it('re-asks on an invalid name without advancing', async () => {
    fakePrisma.botUser.create({ data: { id: 60n } });
    fakePrisma.funnelSession.create({ data: { userId: 60n, state: State.OnboardingName } });
    const { bot, calls } = boot();

    await bot.handleUpdate(textUpdate('J', user(60)));

    expect(lastText(calls).toLowerCase()).toContain('valid name');
    expect(fakePrisma.botUser.findUnique({ where: { id: 60n } })?.name).toBeNull();
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 60n } })?.state).toBe(State.OnboardingName);
  });

  it('re-asks on an invalid phone without completing', async () => {
    fakePrisma.botUser.create({ data: { id: 61n, name: 'Jane' } });
    fakePrisma.funnelSession.create({ data: { userId: 61n, state: State.OnboardingPhone } });
    const { bot, calls } = boot();

    await bot.handleUpdate(textUpdate('not-a-phone', user(61)));

    expect(lastText(calls).toLowerCase()).toContain('valid phone');
    expect(fakePrisma.botUser.findUnique({ where: { id: 61n } })?.onboardedAt).toBeNull();
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 61n } })?.state).toBe(State.OnboardingPhone);
  });
});
