// Standalone commands that must work from any state. Mounted early so /cancel
// interrupts whatever step the user is on.
import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { copy } from '../copy.js';
import { isOnboarded } from '../flows/state.js';
import { enterMenu } from './menu.js';
import { getUser } from '../../services/users.js';

export const commandsFeature = new Composer<BotContext>();

commandsFeature.command('cancel', async (ctx) => {
  await ctx.reply(copy.cancelled(), { parse_mode: 'HTML' });
  const u = await getUser(ctx.userId);
  // Back to the broker menu if they've onboarded; otherwise leave them at the
  // intro (a fresh /start restarts onboarding).
  if (u?.onboardedAt || isOnboarded(ctx.session.state)) {
    await enterMenu(ctx);
  }
});
