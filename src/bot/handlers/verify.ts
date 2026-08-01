// Verification hand-off. The broker step captures the identifier then calls
// beginVerification(). P3 implements the real referred-clients lookup + eligibility
// + pass/fail/fallback branching here; for now it just shows the "checking" copy.
import type { BotContext } from '../context.js';
import { copy } from '../copy.js';

export async function beginVerification(ctx: BotContext): Promise<void> {
  await ctx.reply(copy.checking(), { parse_mode: 'HTML' });
  // P3: look up ctx.session.identifier under ctx.session.broker in referred_client,
  //     apply eligibility, then advance to AwaitingContact or route to manual review.
}
