// Repository for the synced referred-clients snapshot — the ONLY thing the bot's
// "checking" step reads. The sync worker keeps it fresh out of band. Identifiers
// are normalized (trim + lowercase) so lookups match regardless of how the user
// typed them.
import { prisma } from '../db/prisma.js';

export function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export interface ReferredRow {
  identifier: string;
  deposits?: number | null;
  volumeLots?: number | null;
}

export function findReferredClient(broker: string, identifier: string) {
  return prisma.referredClient.findUnique({
    where: { broker_identifier: { broker, identifier: normalizeIdentifier(identifier) } },
  });
}

/** Most recent sync time for a broker's list (null if we've never synced it). */
export async function latestSyncAt(broker: string): Promise<Date | null> {
  const row = await prisma.referredClient.findFirst({ where: { broker }, orderBy: { syncedAt: 'desc' } });
  return row?.syncedAt ?? null;
}

/** Upsert a batch of clients for a broker, stamping syncedAt=now. Returns count. */
export async function upsertReferredClients(broker: string, rows: ReferredRow[]): Promise<number> {
  const syncedAt = new Date();
  for (const r of rows) {
    const identifier = normalizeIdentifier(r.identifier);
    if (!identifier) continue;
    await prisma.referredClient.upsert({
      where: { broker_identifier: { broker, identifier } },
      create: { broker, identifier, deposits: r.deposits ?? null, volumeLots: r.volumeLots ?? null, syncedAt },
      update: { deposits: r.deposits ?? null, volumeLots: r.volumeLots ?? null, syncedAt },
    });
  }
  return rows.length;
}
