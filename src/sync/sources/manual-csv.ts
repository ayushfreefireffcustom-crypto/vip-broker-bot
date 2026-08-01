// The floor source: read <broker>.csv from a directory. Drop an export in, the
// worker ingests it on the next tick. Missing file → null (list left as-is).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ClientListSource } from '../source.js';
import type { ReferredRow } from '../../services/referred-clients.js';
import { parseClientCsv } from '../csv.js';

export class ManualCsvSource implements ClientListSource {
  readonly name = 'manual-csv';
  constructor(private readonly dir: string) {}

  async fetch(broker: string): Promise<ReferredRow[] | null> {
    const file = path.join(this.dir, `${broker}.csv`);
    try {
      const text = await readFile(file, 'utf8');
      return parseClientCsv(text);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }
}
