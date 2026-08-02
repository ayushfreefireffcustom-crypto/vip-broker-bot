// Real-time ingest endpoint logic. Broker platforms (Exness Partnership API,
// Vantage/Cellxpert, XM S2S) POST client register/deposit/volume events to
// /ingest/<broker>; we normalize and upsert them into referred_clients so the
// bot's "checking" step is always current — no CSV, no scraping.
//
// The HTTP wiring lives in bot/main.ts; this module is the pure, testable core.
import { env } from '../config/env.js';
import { isBrokerKey } from '../bot/flows/brokers.js';
import { upsertReferredClients, type ReferredRow } from '../services/referred-clients.js';

const ID_KEYS = ['identifier', 'uid', 'email', 'account', 'account_number', 'login', 'client_account', 'clientid'];
const DEP_KEYS = ['deposits', 'deposit', 'funded', 'balance', 'funds', 'ftd', 'deposit_amount'];
const VOL_KEYS = ['volume', 'volumelots', 'lots', 'volume_lots', 'traded_lots'];

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k.toLowerCase()) && v != null && String(v).trim() !== '') return v;
  }
  return undefined;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Accept a single client object or an array of them. Tolerant of key naming. */
export function parseIngestBody(body: unknown): ReferredRow[] {
  const items = Array.isArray(body) ? body : body && typeof body === 'object' ? [body] : [];
  const rows: ReferredRow[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const idRaw = pick(o, ID_KEYS);
    if (idRaw == null) continue;
    rows.push({ identifier: String(idRaw), deposits: toNum(pick(o, DEP_KEYS)), volumeLots: toNum(pick(o, VOL_KEYS)) });
  }
  return rows;
}

export interface IngestResult {
  status: number;
  body: Record<string, unknown>;
}

/** Authorize, validate, and upsert. Returns the HTTP status + JSON body. */
export async function handleIngest(broker: string, token: string | undefined, body: unknown): Promise<IngestResult> {
  if (!env.INGEST_TOKEN) return { status: 503, body: { error: 'ingest disabled' } };
  if (token !== env.INGEST_TOKEN) return { status: 401, body: { error: 'unauthorized' } };
  if (!isBrokerKey(broker)) return { status: 400, body: { error: 'unknown broker' } };

  const rows = parseIngestBody(body);
  if (rows.length === 0) return { status: 400, body: { error: 'no valid rows' } };

  const count = await upsertReferredClients(broker, rows);
  return { status: 200, body: { ok: true, broker, count } };
}
