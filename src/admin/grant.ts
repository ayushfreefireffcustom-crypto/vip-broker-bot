// Grant / rejection follow-through. P5-3 implements the real behaviour: on
// approval, mint a single-use VIP invite link and DM it to the user; on rejection,
// DM the user a reason. Stubbed here so P5-2's decision handler has a stable seam.
import type { Verification } from '@prisma/client';
import type { BotContext } from '../bot/context.js';
import { logger } from '../lib/logger.js';

export async function grantAndNotify(_ctx: BotContext, v: Verification): Promise<void> {
  logger.info({ verificationId: v.id, userId: v.userId.toString() }, 'grant approved (invite link + DM: P5-3)');
}

export async function notifyRejected(_ctx: BotContext, v: Verification): Promise<void> {
  logger.info({ verificationId: v.id, userId: v.userId.toString() }, 'notify rejected (DM: P5-3)');
}
