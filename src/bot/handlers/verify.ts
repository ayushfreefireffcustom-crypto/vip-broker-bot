// Verification hand-off — runs the list lookup and drives the "Checking…" UX.
//
// Four outcomes (never a silent dead-end):
//   pass       found + eligible + fresh   → "✅ Verified!" → share contact
//   manual     stale/uncertain list       → "verify manually" → share contact
//   not-linked found=false + fresh list    → send referral link, let them retry
//   ineligible found + under min           → show requirements, let them retry
// The admin remains the final gate (P5); the check is a pre-filter + instant UX.
import type { BotContext } from '../context.js';
import { env } from '../../config/env.js';
import { State } from '../flows/state.js';
import { copy } from '../copy.js';
import { contactKeyboard } from '../keyboards.js';
import { brokerLabel } from '../flows/brokers.js';
import { verifyAccount } from '../../verify/verifier.js';

function refLink(broker: string): string {
  switch (broker) {
    case 'vantage':
      return env.REF_LINK_VANTAGE;
    case 'exness':
      return env.REF_LINK_EXNESS;
    case 'xm':
      return env.REF_LINK_XM;
    default:
      return '';
  }
}

export async function beginVerification(ctx: BotContext): Promise<void> {
  const { broker, identifier } = ctx.session;
  if (!broker || !identifier) {
    ctx.session.state = State.Menu;
    return;
  }

  await ctx.reply(copy.checking(), { parse_mode: 'HTML' });
  const r = await verifyAccount(broker, identifier);

  // Pass, or uncertain (stale) → proceed to share-contact; admin verifies later.
  if ((r.found && r.eligible && !r.stale) || r.stale) {
    ctx.session.state = State.AwaitingContact;
    const text = r.stale && !(r.found && r.eligible) ? copy.manualReview() : copy.verifiedShareContact();
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: contactKeyboard() });
    return;
  }

  // Confident failures → keep them at the identifier step so they can retry.
  if (!r.found) {
    await ctx.reply(copy.notUnderLink(brokerLabel(broker), refLink(broker)), { parse_mode: 'HTML' });
    return;
  }
  await ctx.reply(copy.notEligible(r.reasons), { parse_mode: 'HTML' });
}
