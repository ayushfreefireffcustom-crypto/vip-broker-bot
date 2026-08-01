// Admin CSV upload handler — broker detection, ingest, and the admin gate.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakePrisma, resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, documentUpdate, user, type OutgoingCall } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));
vi.mock('../src/lib/telegram-file.js', () => ({
  downloadFileText: vi.fn(async () => 'uid,funded,lots\n445566,300,1.5\n'),
}));

const { createBot } = await import('../src/bot/bot.js');
const ADMIN = 111;

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  return { bot, calls: recordOutgoing(bot) };
}
const lastText = (calls: OutgoingCall[]): string =>
  [...calls].reverse().find((c) => c.method === 'sendMessage')?.payload?.text ?? '';

describe('admin CSV upload', () => {
  it('ingests vantage.csv from an admin and confirms', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(documentUpdate('F1', 'vantage.csv', user(ADMIN)));

    expect(fakePrisma.referredClient.count({ where: { broker: 'vantage' } })).toBe(1);
    expect(lastText(calls).toLowerCase()).toContain('synced');
  });

  it('ignores a document from a non-admin', async () => {
    const { bot } = boot();
    await bot.handleUpdate(documentUpdate('F1', 'vantage.csv', user(999)));
    expect(fakePrisma.referredClient.count()).toBe(0);
  });

  it('hints when the file name does not identify a broker', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(documentUpdate('F1', 'clients.csv', user(ADMIN)));
    expect(fakePrisma.referredClient.count()).toBe(0);
    expect(lastText(calls).toLowerCase()).toContain('name the file');
  });
});
