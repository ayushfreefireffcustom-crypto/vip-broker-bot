// Onboarding capture: name → phone. Runs only while the session is in an
// onboarding state; other text falls through to later features. Commands are left
// for the command handlers mounted earlier (so /start still restarts mid-flow).
//
// Note on phone verification: the observable flow captures a typed phone here; the
// authoritative check that the number is really the user's is the later Telegram
// "Share Contact" step (request_contact), which needs no SMS/OTP. If literal
// SMS-OTP is ever required, it slots in as an extra state after this one.
import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { State } from '../flows/state.js';
import { copy } from '../copy.js';
import { validateName, validatePhone } from '../../lib/validate.js';
import { setName, completeOnboarding } from '../../services/users.js';
import { enterMenu } from './menu.js';

export const onboardingFeature = new Composer<BotContext>();

onboardingFeature.on('message:text', async (ctx, next) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return next();

  if (ctx.session.state === State.OnboardingName) {
    const r = validateName(text);
    if (!r.ok) {
      await ctx.reply(copy.invalidName(), { parse_mode: 'HTML' });
      return;
    }
    await setName(ctx.userId, r.value);
    ctx.session.state = State.OnboardingPhone;
    await ctx.reply(copy.askPhone(r.value), { parse_mode: 'HTML' });
    return;
  }

  if (ctx.session.state === State.OnboardingPhone) {
    const r = validatePhone(text);
    if (!r.ok) {
      await ctx.reply(copy.invalidPhone(), { parse_mode: 'HTML' });
      return;
    }
    await completeOnboarding(ctx.userId, r.value);
    await ctx.reply(copy.onboardingDone(), { parse_mode: 'HTML' });
    await enterMenu(ctx);
    return;
  }

  return next();
});
