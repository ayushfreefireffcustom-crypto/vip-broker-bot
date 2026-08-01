// Posts each pending verification to the admin group as a card: the balance
// screenshot with a details caption and inline ✅ Approve / ❌ Reject buttons.
// The card's message_id is stored so P5-2 can edit it in place on a decision.
import { InlineKeyboard } from 'grammy';
import type { Verification } from '@prisma/client';
import type { BotContext } from '../bot/context.js';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { getUser } from '../services/users.js';
import { adminCaption } from './copy.js';

export function decisionKeyboard(verificationId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Approve', `adm:approve:${verificationId}`)
    .text('❌ Reject', `adm:reject:${verificationId}`);
}

export async function onPendingVerification(ctx: BotContext, v: Verification): Promise<void> {
  const u = await getUser(v.userId);
  const caption = adminCaption(v, u);
  const reply_markup = decisionKeyboard(v.id);

  const sent = v.screenshotFileId
    ? await ctx.api.sendPhoto(env.ADMIN_GROUP_ID, v.screenshotFileId, { caption, parse_mode: 'HTML', reply_markup })
    : await ctx.api.sendMessage(env.ADMIN_GROUP_ID, caption, { parse_mode: 'HTML', reply_markup });

  await prisma.verification.update({ where: { id: v.id }, data: { adminMessageId: sent.message_id } });
}
