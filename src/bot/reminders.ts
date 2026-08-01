// Drip reminder for users who stalled mid-funnel (in a waiting state, no activity
// for STALE_FUNNEL_MINUTES, not yet reminded). Sends one nudge and marks it so we
// don't nag. Runs on an interval from the bot process (it needs the bot's api).
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { copy } from './copy.js';
import { State } from './flows/state.js';

const WAITING_STATES = [
  State.OnboardingName,
  State.OnboardingPhone,
  State.AwaitingIdentifier,
  State.AwaitingContact,
  State.AwaitingScreenshot,
];

/** Minimal shape of what we need from the bot's Api (so tests pass a fake). */
export interface ReminderSender {
  sendMessage(chatId: number | string, text: string, other?: unknown): Promise<unknown>;
}

export async function runReminders(sender: ReminderSender, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - env.STALE_FUNNEL_MINUTES * 60_000);
  const stalled = await prisma.funnelSession.findMany({
    where: { state: { in: WAITING_STATES }, updatedAt: { lt: cutoff }, remindedAt: null },
  });

  let sent = 0;
  for (const s of stalled) {
    try {
      await sender.sendMessage(Number(s.userId), copy.reminder(), { parse_mode: 'HTML' });
      await prisma.funnelSession.update({ where: { userId: s.userId }, data: { remindedAt: now } });
      sent += 1;
    } catch (err) {
      logger.warn({ userId: s.userId.toString(), err }, 'reminder send failed');
    }
  }
  if (sent > 0) logger.info({ sent }, 'stalled-funnel reminders sent');
  return sent;
}
