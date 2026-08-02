// /start — the funnel's front door. First-time users get the intro card + a
// "Start Verification" button that kicks off onboarding; returning (onboarded)
// users go straight to the broker menu.
import { Composer, InlineKeyboard } from 'grammy';
import type { BotContext } from '../context.js';
import { env } from '../../config/env.js';
import { State } from '../flows/state.js';
import { copy } from '../copy.js';
import { getUser } from '../../services/users.js';
import { enterMenu } from './menu.js';

export const startFeature = new Composer<BotContext>();

startFeature.command('start', async (ctx) => {
  const u = await getUser(ctx.userId);
  if (u?.onboardedAt) {
    await enterMenu(ctx);
    return;
  }
  ctx.session.state = State.Idle;
  await ctx.reply(copy.intro(), {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text(copy.startButton, 'start_verify'),
  });
});

startFeature.callbackQuery('start_verify', async (ctx) => {
  await ctx.answerCallbackQuery();
  // First-run tutorial video (matches the original bot), if configured.
  if (env.INTRO_VIDEO) {
    try {
      await ctx.replyWithVideo(env.INTRO_VIDEO);
    } catch {
      /* bad file_id/URL — skip the video, don't block onboarding */
    }
  }
  ctx.session.state = State.OnboardingName;
  await ctx.reply(copy.askName(), { parse_mode: 'HTML' });
});
