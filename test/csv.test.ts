import { describe, it, expect } from 'vitest';
import { parseClientCsv } from '../src/sync/csv.js';

describe('parseClientCsv', () => {
  it('parses email/deposits/volume with flexible headers', () => {
    const rows = parseClientCsv('email,deposits,volume\nalice@example.com,250.00,0.8\nbob@example.com,120,0.2\n');
    expect(rows).toEqual([
      { identifier: 'alice@example.com', deposits: 250, volumeLots: 0.8 },
      { identifier: 'bob@example.com', deposits: 120, volumeLots: 0.2 },
    ]);
  });

  it('accepts uid/funded/lots column aliases', () => {
    const rows = parseClientCsv('uid,funded,lots\n1048201,300,1.5\n');
    expect(rows[0]).toEqual({ identifier: '1048201', deposits: 300, volumeLots: 1.5 });
  });

  it('handles quoted fields, currency symbols and blank lines', () => {
    const rows = parseClientCsv('account,balance,lots\n"12,345","$1,000.50","2"\n\n');
    expect(rows[0]).toEqual({ identifier: '12,345', deposits: 1000.5, volumeLots: 2 });
  });

  it('leaves missing numeric columns null', () => {
    const rows = parseClientCsv('uid\n999888\n');
    expect(rows[0]).toEqual({ identifier: '999888', deposits: null, volumeLots: null });
  });

  it('returns [] with no identifier column or no data rows', () => {
    expect(parseClientCsv('foo,bar\n1,2\n')).toEqual([]);
    expect(parseClientCsv('uid,funded\n')).toEqual([]);
    expect(parseClientCsv('')).toEqual([]);
  });
});
