// Broker menu entry. Onboarding completion, /start (returning user) and /cancel
// all funnel back here. Renders the [Vantage][Exness][XM] inline keyboard whose
// buttons carry `broker:<key>` callback data.
import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../context.js';
import { State } from '../flows/state.js';
import { copy } from '../copy.js';
import { BROKER_KEYS, BROKERS } from '../flows/brokers.js';

export function brokerKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const key of BROKER_KEYS) kb.text(BROKERS[key].label, `broker:${key}`);
  return kb;
}

export async function enterMenu(ctx: BotContext): Promise<void> {
  ctx.session.state = State.Menu;
  ctx.session.broker = null;
  ctx.session.identifier = null;
  ctx.session.screenshotFileId = null;
  await ctx.reply(copy.chooseBroker(), { parse_mode: 'HTML', reply_markup: brokerKeyboard() });
}
