// Loads the DB-backed FSM session around every update: ensures the bot_user row
// exists (FK target for funnel_session), attaches ctx.session + ctx.userId, then
// persists the session afterwards if a handler mutated it. Updates without a
// `from` (e.g. some channel posts) are passed through untouched.
import type { NextFunction } from 'grammy';
import { prisma } from '../../db/prisma.js';
import type { BotContext, SessionData } from '../context.js';
import { defaultSession } from '../context.js';

function snapshot(s: SessionData): string {
  return JSON.stringify([s.state, s.broker, s.identifier, s.screenshotFileId]);
}

export async function withSession(ctx: BotContext, next: NextFunction): Promise<void> {
  const from = ctx.from;
  if (!from) return next();

  const userId = BigInt(from.id);
  ctx.userId = userId;

  // Ensure the user row exists; refresh username only (never clobber name/phone).
  await prisma.botUser.upsert({
    where: { id: userId },
    create: { id: userId, username: from.username ?? null },
    update: { username: from.username ?? null },
  });

  const row = await prisma.funnelSession.findUnique({ where: { userId } });
  ctx.session = row
    ? { state: row.state, broker: row.broker, identifier: row.identifier, screenshotFileId: row.screenshotFileId }
    : defaultSession();

  const before = snapshot(ctx.session);
  await next();
  if (snapshot(ctx.session) === before) return; // nothing changed — skip the write

  const data = {
    state: ctx.session.state,
    broker: ctx.session.broker,
    identifier: ctx.session.identifier,
    screenshotFileId: ctx.session.screenshotFileId,
  };
  await prisma.funnelSession.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
