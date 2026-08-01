// Grant / rejection follow-through (runs after an admin decision).
//  approve → mint a single-use, 24h-expiring VIP invite link, record it, DM it.
//  reject  → DM the user a reason.
// Either way the user's funnel session is reset so they land cleanly on /start.
import type { Verification } from '@prisma/client';
import type { BotContext } from '../bot/context.js';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../lib/logger.js';
import { copy } from '../bot/copy.js';
import { State } from '../bot/flows/state.js';

const DAY_SECONDS = 24 * 60 * 60;

async function resetSession(userId: bigint): Promise<void> {
  await prisma.funnelSession.updateMany({
    where: { userId },
    data: { state: State.Idle, broker: null, identifier: null, screenshotFileId: null },
  });
}

export async function grantAndNotify(ctx: BotContext, v: Verification): Promise<void> {
  const expireUnix = Math.floor(Date.now() / 1000) + DAY_SECONDS;
  const link = await ctx.api.createChatInviteLink(env.VIP_CHANNEL_ID, {
    member_limit: 1,
    expire_date: expireUnix,
  });

  await prisma.channelGrant.create({
    data: { userId: v.userId, inviteLink: link.invite_link, expiresAt: new Date(expireUnix * 1000) },
  });
  await ctx.api.sendMessage(Number(v.userId), copy.approvedDm(link.invite_link), { parse_mode: 'HTML' });
  await resetSession(v.userId);
  logger.info({ userId: v.userId.toString() }, 'granted VIP access');
}

export async function notifyRejected(ctx: BotContext, v: Verification): Promise<void> {
  await ctx.api.sendMessage(Number(v.userId), copy.rejectedDm(), { parse_mode: 'HTML' });
  await resetSession(v.userId);
  logger.info({ userId: v.userId.toString() }, 'notified rejection');
}
