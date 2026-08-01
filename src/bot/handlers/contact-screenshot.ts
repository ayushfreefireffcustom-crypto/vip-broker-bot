// Share-contact → balance-screenshot capture. The shared Telegram contact gives
// us the user's authoritative (verified) phone with no SMS/OTP. The screenshot is
// stored as a Telegram file_id (Telegram holds the bytes; we keep the reference).
// Submitting the screenshot creates the pending Verification and hands off to the
// admin panel.
import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { State } from '../flows/state.js';
import { copy } from '../copy.js';
import { brokerLabel } from '../flows/brokers.js';
import { saveSharedContact } from '../../services/users.js';
import { createPendingVerification } from '../../services/verifications.js';
import { verifyAccount } from '../../verify/verifier.js';
import { onPendingVerification } from '../../admin/panel.js';

export const contactScreenshotFeature = new Composer<BotContext>();

contactScreenshotFeature.on('message:contact', async (ctx, next) => {
  if (ctx.session.state !== State.AwaitingContact) return next();

  await saveSharedContact(ctx.userId, ctx.message.contact.phone_number);
  ctx.session.state = State.AwaitingScreenshot;
  await ctx.reply(copy.contactThanks(brokerLabel(ctx.session.broker ?? '')), {
    parse_mode: 'HTML',
    reply_markup: { remove_keyboard: true },
  });
});

contactScreenshotFeature.on('message:photo', async (ctx, next) => {
  if (ctx.session.state !== State.AwaitingScreenshot) return next();

  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1]?.file_id; // largest rendition
  if (!fileId) return;

  const { broker, identifier } = ctx.session;
  if (!broker || !identifier) {
    ctx.session.state = State.Menu;
    return;
  }

  ctx.session.screenshotFileId = fileId;
  const facts = await verifyAccount(broker, identifier);
  const verification = await createPendingVerification({ userId: ctx.userId, broker, identifier, facts, screenshotFileId: fileId });

  ctx.session.state = State.PendingAdmin;
  await ctx.reply(copy.receivedPending(), { parse_mode: 'HTML' });
  await onPendingVerification(ctx, verification);
});

// While waiting for the screenshot, nudge non-photo messages toward a photo.
contactScreenshotFeature.on('message:text', async (ctx, next) => {
  if (ctx.session.state === State.AwaitingScreenshot && !ctx.message.text.startsWith('/')) {
    await ctx.reply(copy.needPhoto(), { parse_mode: 'HTML' });
    return;
  }
  return next();
});
