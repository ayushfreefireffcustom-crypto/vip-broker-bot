// Admin-facing copy — the case card the admin group sees for each pending case.
import type { Verification, BotUser } from '@prisma/client';
import { brokerLabel } from '../bot/flows/brokers.js';

function checkLine(v: Verification): string {
  if (!v.found) return '❌ auto-check: NOT found under our link';
  return v.eligible ? '✅ auto-check: PASSED (under link + eligible)' : '⚠️ auto-check: found but INELIGIBLE';
}

export function adminCaption(v: Verification, u: BotUser | null): string {
  const handle = u?.username ? ` (@${u.username})` : '';
  return [
    '🆕 <b>Pending verification</b>',
    `👤 ${u?.name ?? '—'}${handle}`,
    `📱 ${u?.phone ?? '—'}`,
    `🏦 ${brokerLabel(v.broker)} — <code>${v.identifier}</code>`,
    `💰 deposit: ${v.deposits ?? '—'}   📊 volume: ${v.volumeLots ?? '—'} lots`,
    checkLine(v),
    `<i>ref:</i> <code>${v.id}</code>`,
  ].join('\n');
}

/** Appended to the card once an admin decides. */
export function decisionLine(status: 'approved' | 'rejected', adminId: bigint): string {
  const verb = status === 'approved' ? '✅ APPROVED' : '❌ REJECTED';
  return `\n\n${verb} by <a href="tg://user?id=${adminId}">admin</a>`;
}

export const adminCsvNameHint = (): string =>
  'Please name the file <code>vantage.csv</code>, <code>exness.csv</code> or <code>xm.csv</code> so I know which broker it belongs to.';

export const adminCsvIngested = (label: string, n: number): string => `✅ Synced <b>${label}</b> — ${n} client(s) updated.`;

export const adminCsvDownloadFailed = (): string => 'Could not download that file. Please try again.';
