// Admin Approve/Reject on the case card. Gated to whitelisted admins; the
// decision is atomic (a double-tap or a second admin gets "already handled"), the
// card is edited in place to show the outcome, then grant/notify runs.
import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { isAdmin } from '../../admin/auth.js';
import { decideVerification } from '../../services/verifications.js';
import { getUser } from '../../services/users.js';
import { adminCaption, decisionLine } from '../../admin/copy.js';
import { grantAndNotify, notifyRejected } from '../../admin/grant.js';

export const adminFeature = new Composer<BotContext>();

adminFeature.callbackQuery(/^adm:(approve|reject):(.+)$/, async (ctx) => {
  const action = ctx.match[1];
  const vid = ctx.match[2];

  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCallbackQuery({ text: 'Not authorized', show_alert: true });
    return;
  }
  if (!action || !vid) {
    await ctx.answerCallbackQuery();
    return;
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const adminId = BigInt(ctx.from.id);
  const v = await decideVerification(vid, status, adminId);
  if (!v) {
    await ctx.answerCallbackQuery({ text: 'Already handled' });
    return;
  }

  await ctx.answerCallbackQuery({ text: status === 'approved' ? 'Approved ✅' : 'Rejected ❌' });

  // Reflect the decision on the card (best-effort — an old card may be uneditable).
  const u = await getUser(v.userId);
  try {
    await ctx.editMessageCaption({ caption: adminCaption(v, u) + decisionLine(status, adminId), parse_mode: 'HTML' });
  } catch {
    /* ignore edit failures */
  }

  if (status === 'approved') await grantAndNotify(ctx, v);
  else await notifyRejected(ctx, v);
});
