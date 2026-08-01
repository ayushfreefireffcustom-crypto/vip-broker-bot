// Broker selection + identifier collection. Selecting a broker sends the helper
// image (if configured) + a UID/email prompt; the next text is validated per the
// broker's id type, stored, and handed to verification.
import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { env } from '../../config/env.js';
import { State } from '../flows/state.js';
import { copy } from '../copy.js';
import { BROKERS, isBrokerKey, type BrokerKey } from '../flows/brokers.js';
import { validateIdentifier } from '../../lib/validate.js';
import { beginVerification } from './verify.js';

export const brokerFeature = new Composer<BotContext>();

function helpImage(key: BrokerKey): string {
  switch (key) {
    case 'vantage':
      return env.HELP_IMAGE_VANTAGE;
    case 'exness':
      return env.HELP_IMAGE_EXNESS;
    case 'xm':
      return env.HELP_IMAGE_XM;
  }
}

function idPrompt(key: BrokerKey): string {
  const b = BROKERS[key];
  return b.idType === 'email' ? copy.askEmail(b.label) : copy.askUid(b.label);
}

brokerFeature.callbackQuery(/^broker:(.+)$/, async (ctx) => {
  const key = ctx.match[1];
  await ctx.answerCallbackQuery();
  if (!key || !isBrokerKey(key)) return;

  ctx.session.broker = key;
  ctx.session.identifier = null;
  ctx.session.state = State.AwaitingIdentifier;

  const prompt = idPrompt(key);
  const image = helpImage(key);
  if (image) {
    await ctx.replyWithPhoto(image, { caption: prompt, parse_mode: 'HTML' });
  } else {
    await ctx.reply(prompt, { parse_mode: 'HTML' });
  }
});

brokerFeature.on('message:text', async (ctx, next) => {
  if (ctx.session.state !== State.AwaitingIdentifier) return next();
  const text = ctx.message.text;
  if (text.startsWith('/')) return next();

  const key = ctx.session.broker;
  if (!key || !isBrokerKey(key)) {
    ctx.session.state = State.Menu;
    return next();
  }

  const b = BROKERS[key];
  const r = validateIdentifier(b.idType, text);
  if (!r.ok) {
    await ctx.reply(b.idType === 'email' ? copy.invalidEmail() : copy.invalidUid(b.label), { parse_mode: 'HTML' });
    return;
  }

  ctx.session.identifier = r.value;
  await beginVerification(ctx);
});
