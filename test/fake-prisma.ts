// A tiny in-memory stand-in for the Prisma client, covering exactly the models
// and methods this bot uses. It lets handler/repo tests run with realistic DB
// behaviour but no Postgres. Equality-only `where` matching (with bigint and
// nested composite-unique support) is enough for our queries.
//
// Tests mock the singleton with:  vi.mock('../../src/db/prisma.js', () => ({ prisma: fakePrisma }));
// and call resetDb() in beforeEach.
import { randomUUID } from 'node:crypto';

type Row = Record<string, unknown>;

interface TableOpts {
  pk: string;
  autoId?: boolean; // generate a uuid pk when absent
  defaults?: () => Row; // per-create defaults (booleans, timestamps, nulls)
  hasUpdatedAt?: boolean;
}

function eq(a: unknown, b: unknown): boolean {
  if (typeof a === 'bigint' || typeof b === 'bigint') {
    try {
      return BigInt(a as never) === BigInt(b as never);
    } catch {
      return false;
    }
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

class Table {
  rows: Row[] = [];
  constructor(private opts: TableOpts) {}

  private static OPS = new Set(['not', 'equals', 'in', 'notIn', 'gt', 'gte', 'lt', 'lte', 'contains']);

  private static matchOps(cell: unknown, ops: Row): boolean {
    for (const [op, val] of Object.entries(ops)) {
      switch (op) {
        case 'not':
          if (eq(cell, val)) return false;
          break;
        case 'equals':
          if (!eq(cell, val)) return false;
          break;
        case 'in':
          if (!(val as unknown[]).some((x) => eq(cell, x))) return false;
          break;
        case 'notIn':
          if ((val as unknown[]).some((x) => eq(cell, x))) return false;
          break;
        case 'gt':
          if (!(cell != null && (cell as number) > (val as number))) return false;
          break;
        case 'gte':
          if (!(cell != null && (cell as number) >= (val as number))) return false;
          break;
        case 'lt':
          if (!(cell != null && (cell as number) < (val as number))) return false;
          break;
        case 'lte':
          if (!(cell != null && (cell as number) <= (val as number))) return false;
          break;
        case 'contains':
          if (!String(cell ?? '').includes(String(val))) return false;
          break;
      }
    }
    return true;
  }

  private match(row: Row, where: Row): boolean {
    for (const [k, v] of Object.entries(where)) {
      if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
        const keys = Object.keys(v as Row);
        if (keys.length > 0 && keys.every((kk) => Table.OPS.has(kk))) {
          // Operator object like { not: null } / { in: [...] }.
          if (!Table.matchOps(row[k], v as Row)) return false;
        } else if (!this.match(row, v as Row)) {
          // Composite unique like { broker_identifier: { broker, identifier } }.
          return false;
        }
      } else if (!eq(row[k], v)) {
        return false;
      }
    }
    return true;
  }

  private sort(rows: Row[], orderBy?: Row): Row[] {
    if (!orderBy) return rows;
    const [key, dir] = Object.entries(orderBy)[0] as [string, 'asc' | 'desc'];
    return [...rows].sort((a, b) => {
      const av = a[key] as never;
      const bv = b[key] as never;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'desc' ? -cmp : cmp;
    });
  }

  private make(data: Row): Row {
    const row: Row = { ...(this.opts.defaults?.() ?? {}), ...data };
    if (this.opts.autoId && row[this.opts.pk] == null) row[this.opts.pk] = randomUUID();
    const now = new Date();
    if (row['createdAt'] == null) row['createdAt'] = now;
    if (this.opts.hasUpdatedAt) row['updatedAt'] = now;
    return row;
  }

  findUnique({ where }: { where: Row }): Row | null {
    return this.rows.find((r) => this.match(r, where)) ?? null;
  }
  findFirst({ where, orderBy }: { where?: Row; orderBy?: Row } = {}): Row | null {
    const found = this.sort(this.rows.filter((r) => this.match(r, where ?? {})), orderBy);
    return found[0] ?? null;
  }
  findMany({ where, orderBy, take }: { where?: Row; orderBy?: Row; take?: number } = {}): Row[] {
    const found = this.sort(this.rows.filter((r) => this.match(r, where ?? {})), orderBy);
    return take != null ? found.slice(0, take) : found;
  }
  count({ where }: { where?: Row } = {}): number {
    return this.rows.filter((r) => this.match(r, where ?? {})).length;
  }
  create({ data }: { data: Row }): Row {
    const row = this.make(data);
    this.rows.push(row);
    return row;
  }
  createMany({ data }: { data: Row[] }): { count: number } {
    for (const d of data) this.rows.push(this.make(d));
    return { count: data.length };
  }
  update({ where, data }: { where: Row; data: Row }): Row {
    const row = this.rows.find((r) => this.match(r, where));
    if (!row) throw new Error('fake-prisma: update — record not found');
    this.applyData(row, data);
    return row;
  }
  updateMany({ where, data }: { where?: Row; data: Row }): { count: number } {
    const targets = this.rows.filter((r) => this.match(r, where ?? {}));
    for (const r of targets) this.applyData(r, data);
    return { count: targets.length };
  }
  upsert({ where, create, update }: { where: Row; create: Row; update: Row }): Row {
    const row = this.rows.find((r) => this.match(r, where));
    if (row) {
      this.applyData(row, update);
      return row;
    }
    return this.create({ data: create });
  }
  delete({ where }: { where: Row }): Row {
    const i = this.rows.findIndex((r) => this.match(r, where));
    if (i < 0) throw new Error('fake-prisma: delete — record not found');
    return this.rows.splice(i, 1)[0] as Row;
  }
  deleteMany({ where }: { where?: Row } = {}): { count: number } {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !this.match(r, where ?? {}));
    return { count: before - this.rows.length };
  }

  private applyData(row: Row, data: Row): void {
    for (const [k, v] of Object.entries(data)) {
      // Support Prisma's { increment: n } atomic update.
      if (v && typeof v === 'object' && 'increment' in (v as Row)) {
        row[k] = (Number(row[k]) || 0) + Number((v as Row)['increment']);
      } else {
        row[k] = v;
      }
    }
    if (this.opts.hasUpdatedAt) row['updatedAt'] = new Date();
  }
}

function buildTables() {
  return {
    botUser: new Table({ pk: 'id', hasUpdatedAt: true, defaults: () => ({ contactShared: false, name: null, phone: null, username: null, onboardedAt: null }) }),
    funnelSession: new Table({ pk: 'userId', hasUpdatedAt: true, defaults: () => ({ state: 'idle', broker: null, identifier: null, screenshotFileId: null }) }),
    verification: new Table({ pk: 'id', autoId: true, defaults: () => ({ found: false, eligible: false, status: 'pending_admin', deposits: null, volumeLots: null, screenshotFileId: null, adminMessageId: null, decidedBy: null, decidedAt: null }) }),
    referredClient: new Table({ pk: 'id', autoId: true, defaults: () => ({ deposits: null, volumeLots: null, syncedAt: new Date() }) }),
    channelGrant: new Table({ pk: 'id', autoId: true, defaults: () => ({ joined: false, expiresAt: null }) }),
  };
}

type Tables = ReturnType<typeof buildTables>;

// The exported singleton the tests inject in place of the real client.
export const fakePrisma = {
  ...buildTables(),
  $disconnect: async () => {},
} as unknown as Tables & { $disconnect: () => Promise<void> };

/** Wipe every table between tests. */
export function resetDb(): void {
  const fresh = buildTables();
  for (const key of Object.keys(fresh) as (keyof Tables)[]) {
    (fakePrisma as unknown as Tables)[key] = fresh[key];
  }
}
