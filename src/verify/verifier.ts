// BrokerVerifier — the bot's read side of verification. Looks the identifier up in
// the synced referred_clients table, applies eligibility, and flags staleness so a
// too-old list can't produce a confident "not found". It returns FACTS only; the
// bot's Checking handler (P3-2) decides the pass/fail/fallback UX. All three
// brokers share this one path today (no live API); a live-API source is a later
// drop-in behind the sync worker.
import { env } from '../config/env.js';
import { findReferredClient, latestSyncAt } from '../services/referred-clients.js';
import { checkEligibility } from './eligibility.js';

export interface VerifyResult {
  found: boolean;
  eligible: boolean;
  /** The list backing this answer is older than LIST_STALE_MINUTES (or empty). */
  stale: boolean;
  deposits: number | null;
  volumeLots: number | null;
  reasons: string[];
  syncedAt: Date | null;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function verifyAccount(broker: string, identifier: string): Promise<VerifyResult> {
  const staleMs = env.LIST_STALE_MINUTES * 60_000;
  const thresholds = { minDeposit: env.MIN_DEPOSIT_USD, minVolume: env.MIN_VOLUME_LOTS };

  const row = await findReferredClient(broker, identifier);

  if (!row) {
    // A "not found" is only trustworthy if the list is fresh; otherwise we can't
    // tell "not our client" from "not synced yet" → mark stale → manual review.
    const listAt = await latestSyncAt(broker);
    const stale = !listAt || Date.now() - listAt.getTime() > staleMs;
    return {
      found: false,
      eligible: false,
      stale,
      deposits: null,
      volumeLots: null,
      reasons: ['not found under our link'],
      syncedAt: listAt,
    };
  }

  const deposits = toNum(row.deposits);
  const volumeLots = toNum(row.volumeLots);
  const { eligible, reasons } = checkEligibility({ deposits, volumeLots }, thresholds);
  const stale = Date.now() - row.syncedAt.getTime() > staleMs;

  return { found: true, eligible, stale, deposits, volumeLots, reasons, syncedAt: row.syncedAt };
}
