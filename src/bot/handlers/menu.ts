// Broker menu entry. Onboarding completion, /start (returning user) and /cancel
// all funnel back here. Phase 2 renders the [Vantage][Exness][XM] inline keyboard;
// for now it resets the session to the menu state and prompts.
import type { BotContext } from '../context.js';
import { State } from '../flows/state.js';
import { copy } from '../copy.js';

export async function enterMenu(ctx: BotContext): Promise<void> {
  ctx.session.state = State.Menu;
  ctx.session.broker = null;
  ctx.session.identifier = null;
  ctx.session.screenshotFileId = null;
  // P2: attach the broker inline keyboard here.
  await ctx.reply(copy.chooseBroker(), { parse_mode: 'HTML' });
}
