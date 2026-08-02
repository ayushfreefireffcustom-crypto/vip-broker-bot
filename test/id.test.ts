// The /id setup helper.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetDb } from './fake-prisma.js';
import { BOT_INFO, recordOutgoing, textUpdate, forwardedChannelUpdate, user, type OutgoingCall } from './harness.js';

vi.mock('../src/db/prisma.js', async () => ({ prisma: (await import('./fake-prisma.js')).fakePrisma }));

const { createBot } = await import('../src/bot/bot.js');

beforeEach(() => resetDb());

function boot(): { bot: import('grammy').Bot<import('../src/bot/context.js').BotContext>; calls: OutgoingCall[] } {
  const bot = createBot('123:TEST', { botInfo: BOT_INFO });
  return { bot, calls: recordOutgoing(bot) };
}

describe('/id helper', () => {
  it('replies with the chat id and your user id', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(textUpdate('/id', user(4242)));
    const text = calls[0]!.payload.text as string;
    expect(text).toContain('chat id');
    expect(text).toContain('4242');
  });

  it('reveals a channel id from a forwarded channel post', async () => {
    const { bot, calls } = boot();
    await bot.handleUpdate(forwardedChannelUpdate(-1001234567890, 'My VIP Channel', user(1)));
    const text = calls[0]!.payload.text as string;
    expect(text).toContain('channel id');
    expect(text).toContain('-1001234567890');
  });
});
