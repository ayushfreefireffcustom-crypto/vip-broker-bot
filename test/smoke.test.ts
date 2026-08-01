// Proves the foundation works end-to-end offline: session middleware ensures the
// user + session rows, a handler can mutate ctx.session, the change is persisted,
// and the outgoing reply is captured — all against the in-memory fake DB.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Bot } from 'grammy';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, textUpdate, user } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

// Imported after the mock is registered.
const { withSession } = await import('../src/bot/middleware/session.js');
const { State } = await import('../src/bot/flows/state.js');
type BotContext = import('../src/bot/context.js').BotContext;

beforeEach(() => resetDb());

describe('session middleware + harness', () => {
  it('creates the user + session, persists a mutation, and captures the reply', async () => {
    const bot = new Bot<BotContext>('123:TEST', { botInfo: BOT_INFO });
    bot.use(withSession);
    bot.on('message', async (ctx) => {
      ctx.session.state = State.Menu;
      ctx.session.broker = 'exness';
      await ctx.reply('hello');
    });
    const calls = recordOutgoing(bot);

    await bot.handleUpdate(textUpdate('hi', user(42)));

    // Outgoing reply captured.
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe('sendMessage');
    expect(calls[0]!.payload.text).toBe('hello');

    // User row created.
    const u = fakePrisma.botUser.findUnique({ where: { id: 42n } });
    expect(u).not.toBeNull();

    // Session persisted with the mutation.
    const s = fakePrisma.funnelSession.findUnique({ where: { userId: 42n } });
    expect(s?.state).toBe(State.Menu);
    expect(s?.broker).toBe('exness');
  });

  it('skips the session write when nothing changed', async () => {
    const bot = new Bot<BotContext>('123:TEST', { botInfo: BOT_INFO });
    bot.use(withSession);
    bot.on('message', async (ctx) => {
      await ctx.reply('noop');
    });
    recordOutgoing(bot);

    await bot.handleUpdate(textUpdate('hi', user(7)));

    // No session row written because the handler never touched ctx.session.
    expect(fakePrisma.funnelSession.findUnique({ where: { userId: 7n } })).toBeNull();
  });
});
