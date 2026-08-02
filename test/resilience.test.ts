// A failing update (e.g. the DB is down) must be caught, not crash the process.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, textUpdate, user } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');

beforeEach(() => resetDb());

describe('error boundary', () => {
  it('bot.catch swallows a DB failure instead of crashing', async () => {
    const bot = createBot('123:TEST', { botInfo: BOT_INFO });
    recordOutgoing(bot);
    // Simulate the database being unavailable during session load.
    fakePrisma.botUser.upsert = (() => {
      throw new Error('db down');
    }) as never;

    // /start reaches the session middleware → DB throws → bot.catch handles it.
    await expect(bot.handleUpdate(textUpdate('/start', user(1)))).resolves.toBeUndefined();
  });
});
