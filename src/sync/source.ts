// The pluggable per-broker sync source. Everything the bot's "checking" step
// needs comes from referred_clients; a ClientListSource is how that table gets
// filled. Today: manual CSV. Future (behind this same interface): an authenticated
// report endpoint, a headless-browser scrape, an emailed report, or a live API.
import type { ReferredRow } from '../services/referred-clients.js';

export interface ClientListSource {
  readonly name: string;
  /**
   * Return the current referred clients for a broker, or `null` when this source
   * can't serve it right now (missing export, portal down). `null` = leave the
   * existing list untouched; an array (even empty) = the fresh snapshot to upsert.
   */
  fetch(broker: string): Promise<ReferredRow[] | null>;
}
