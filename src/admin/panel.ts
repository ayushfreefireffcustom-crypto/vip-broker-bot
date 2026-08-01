// Admin panel seam. P4 creates a pending Verification and calls this; P5-1
// implements posting the case card (details + screenshot + Approve/Reject) to the
// admin group. Kept as its own module so the contact/screenshot handler doesn't
// need to change when the admin flow lands.
import type { Verification } from '@prisma/client';
import type { BotContext } from '../bot/context.js';
import { logger } from '../lib/logger.js';

export async function onPendingVerification(_ctx: BotContext, v: Verification): Promise<void> {
  // P5-1: post the admin-group card with Approve/Reject buttons here.
  logger.info({ verificationId: v.id, broker: v.broker }, 'pending verification created (admin card: P5)');
}
