// The sync worker core: for each broker, ask its source for the current client
// list and upsert it into referred_clients. Upsert (not replace) means a source
// that returns null or throws never wipes a good list — it just goes unrefreshed
// and eventually ages into "stale", which the verifier already handles safely.
import { logger } from '../lib/logger.js';
import { BROKER_KEYS } from '../bot/flows/brokers.js';
import { upsertReferredClients } from '../services/referred-clients.js';
import type { ClientListSource } from './source.js';

/** broker → rows upserted, or -1 when the source had no data / errored. */
export type SyncOutcome = Record<string, number>;

export async function runSync(sources: Partial<Record<string, ClientListSource>>): Promise<SyncOutcome> {
  const outcome: SyncOutcome = {};
  for (const broker of BROKER_KEYS) {
    const source = sources[broker];
    if (!source) {
      outcome[broker] = -1;
      continue;
    }
    try {
      const rows = await source.fetch(broker);
      if (rows == null) {
        logger.warn({ broker, source: source.name }, 'sync: no data — list left unchanged');
        outcome[broker] = -1;
        continue;
      }
      const n = await upsertReferredClients(broker, rows);
      logger.info({ broker, source: source.name, rows: n }, 'sync: upserted');
      outcome[broker] = n;
    } catch (err) {
      logger.error({ broker, err }, 'sync: source failed');
      outcome[broker] = -1;
    }
  }
  return outcome;
}
