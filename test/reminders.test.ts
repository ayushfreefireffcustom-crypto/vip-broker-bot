// Stalled-funnel reminders: nudge only waiting users idle past the threshold, once.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { runReminders } = await import('../src/bot/reminders.js');
const { State } = await import('../src/bot/flows/state.js');

beforeEach(() => resetDb());

const HOURS3 = new Date(Date.now() - 3 * 60 * 60 * 1000);
const RECENT = new Date();

function sender() {
  const sent: number[] = [];
  return {
    sent,
    api: {
      sendMessage: (chatId: number | string) => {
        sent.push(Number(chatId));
        return Promise.resolve({});
      },
    },
  };
}

describe('runReminders', () => {
  it('nudges a stalled waiting user and marks them reminded', async () => {
    fakePrisma.funnelSession.create({ data: { userId: 1n, state: State.AwaitingScreenshot, updatedAt: HOURS3 } });

    const s = sender();
    const count = await runReminders(s.api);

    expect(count).toBe(1);
    expect(s.sent).toEqual([1]);
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 1n } })?.remindedAt).not.toBeNull();
  });

  it('skips recent, admin-waiting, and already-reminded sessions', async () => {
    fakePrisma.funnelSession.create({ data: { userId: 2n, state: State.AwaitingContact, updatedAt: RECENT } });
    fakePrisma.funnelSession.create({ data: { userId: 3n, state: State.PendingAdmin, updatedAt: HOURS3 } });
    fakePrisma.funnelSession.create({ data: { userId: 4n, state: State.AwaitingIdentifier, updatedAt: HOURS3, remindedAt: HOURS3 } });

    const s = sender();
    expect(await runReminders(s.api)).toBe(0);
    expect(s.sent).toEqual([]);
  });

  it('does not re-nudge on a second run', async () => {
    fakePrisma.funnelSession.create({ data: { userId: 5n, state: State.OnboardingPhone, updatedAt: HOURS3 } });

    const s = sender();
    expect(await runReminders(s.api)).toBe(1);
    expect(await runReminders(s.api)).toBe(0);
  });
});
