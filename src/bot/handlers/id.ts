// Setup helper: reveals chat/user ids so you can fill VIP_CHANNEL_ID,
// ADMIN_GROUP_ID and ADMIN_IDS without any third-party bot.
//   • /id in a group or DM → that chat's id + your user id.
//   • forward any post from your channel to the bot → the channel's id.
// Mounted before session/DB middleware so it works with a placeholder DATABASE_URL
// during first-time setup. Safe to remove once you have the ids.
import { Composer } from 'grammy';
import type { BotContext } from '../context.js';

export const idFeature = new Composer<BotContext>();

idFeature.command('id', async (ctx) => {
  await ctx.reply(
    `chat id: <code>${ctx.chat?.id}</code> (${ctx.chat?.type})\nyour id: <code>${ctx.from?.id}</code>`,
    { parse_mode: 'HTML' },
  );
});

idFeature.on('message', async (ctx, next) => {
  const origin = ctx.message.forward_origin;
  if (origin && origin.type === 'channel') {
    await ctx.reply(`channel id: <code>${origin.chat.id}</code>\n${origin.chat.title ?? ''}`, { parse_mode: 'HTML' });
    return;
  }
  return next();
});
