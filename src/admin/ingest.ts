// Ingest an uploaded referred-clients CSV into referred_clients. The broker is
// inferred from the file name (vantage.csv / exness_2026.csv / xm.csv → …).
import { parseClientCsv } from '../sync/csv.js';
import { upsertReferredClients } from '../services/referred-clients.js';
import { BROKER_KEYS, isBrokerKey, type BrokerKey } from '../bot/flows/brokers.js';

export function detectBroker(fileName: string): BrokerKey | null {
  const base = fileName.toLowerCase().replace(/\.csv$/, '').trim();
  if (isBrokerKey(base)) return base;
  return BROKER_KEYS.find((k) => base.startsWith(k)) ?? null;
}

export async function ingestCsvText(broker: string, text: string): Promise<{ count: number }> {
  const rows = parseClientCsv(text);
  const count = await upsertReferredClients(broker, rows);
  return { count };
}
