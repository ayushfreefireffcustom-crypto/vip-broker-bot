// Admin-facing copy — the case card the admin group sees for each pending case.
import type { Verification, BotUser } from '@prisma/client';
import { brokerLabel } from '../bot/flows/brokers.js';
import type { FunnelStats } from './stats.js';

function minutesAgo(d: Date): string {
  const m = Math.round((Date.now() - d.getTime()) / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

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

export function formatPending(rows: Verification[]): string {
  if (rows.length === 0) return '✅ No pending cases.';
  const lines = rows.map(
    (v) => `• ${brokerLabel(v.broker)} <code>${v.identifier}</code> — <code>${v.id.slice(0, 8)}</code>`,
  );
  return `<b>Pending (${rows.length}):</b>\n${lines.join('\n')}`;
}

export function formatStats(s: FunnelStats): string {
  const brokers = Object.entries(s.referred)
    .map(([b, r]) => `  ${brokerLabel(b)}: ${r.count}${r.syncedAt ? ` (synced ${minutesAgo(r.syncedAt)})` : ' (never synced)'}`)
    .join('\n');
  return [
    '<b>📊 Funnel stats</b>',
    `users: ${s.users} (onboarded ${s.onboarded})`,
    `pending: ${s.pending} · approved: ${s.approved} · rejected: ${s.rejected}`,
    'referred lists:',
    brokers,
  ].join('\n');
}
