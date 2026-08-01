// Pure CSV parser for referred-client exports. Tolerant of column-name variants
// (identifier/uid/email/account; deposits/deposit/funded; volume/lots) and quoted
// fields. Returns rows the sync worker upserts into referred_clients.
import type { ReferredRow } from '../services/referred-clients.js';

const ID_COLS = ['identifier', 'uid', 'email', 'account', 'account_number', 'accountid', 'login'];
const DEP_COLS = ['deposits', 'deposit', 'funded', 'balance', 'funds', 'equity'];
const VOL_COLS = ['volume', 'volumelots', 'lots', 'volume_lots', 'traded_lots'];

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else if (ch === '"') {
      quoted = true;
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseClientCsv(text: string): ReferredRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headerLine = lines[0];
  if (!headerLine || lines.length < 2) return [];

  const header = splitLine(headerLine).map((h) => h.toLowerCase());
  const idIdx = header.findIndex((h) => ID_COLS.includes(h));
  const depIdx = header.findIndex((h) => DEP_COLS.includes(h));
  const volIdx = header.findIndex((h) => VOL_COLS.includes(h));
  if (idIdx < 0) return [];

  const rows: ReferredRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i] as string);
    const identifier = cells[idIdx]?.trim();
    if (!identifier) continue;
    rows.push({
      identifier,
      deposits: depIdx >= 0 ? toNumber(cells[depIdx]) : null,
      volumeLots: volIdx >= 0 ? toNumber(cells[volIdx]) : null,
    });
  }
  return rows;
}
