// Maps each broker to the source that feeds its referred-clients list. Today all
// three use the manual-CSV floor; swap an entry here (Exness → live API adapter,
// Vantage/XM → report-endpoint or scrape adapter) once the build-time spike with
// real partner logins confirms each is feasible. Nothing else changes.
import { env } from '../config/env.js';
import { BROKER_KEYS } from '../bot/flows/brokers.js';
import type { ClientListSource } from './source.js';
import { ManualCsvSource } from './sources/manual-csv.js';

export function defaultSources(): Record<string, ClientListSource> {
  const csv = new ManualCsvSource(env.SYNC_CSV_DIR);
  const map: Record<string, ClientListSource> = {};
  for (const broker of BROKER_KEYS) map[broker] = csv;
  return map;
}
