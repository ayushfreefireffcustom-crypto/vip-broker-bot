// Data for the admin /pending and /stats commands.
import { prisma } from '../db/prisma.js';
import { BROKER_KEYS } from '../bot/flows/brokers.js';
import { latestSyncAt } from '../services/referred-clients.js';

export function pendingList(limit = 20) {
  return prisma.verification.findMany({ where: { status: 'pending_admin' }, orderBy: { createdAt: 'desc' }, take: limit });
}

export interface FunnelStats {
  users: number;
  onboarded: number;
  pending: number;
  approved: number;
  rejected: number;
  referred: Record<string, { count: number; syncedAt: Date | null }>;
}

export async function funnelStats(): Promise<FunnelStats> {
  const [users, onboarded, pending, approved, rejected] = await Promise.all([
    prisma.botUser.count(),
    prisma.botUser.count({ where: { onboardedAt: { not: null } } }),
    prisma.verification.count({ where: { status: 'pending_admin' } }),
    prisma.verification.count({ where: { status: 'approved' } }),
    prisma.verification.count({ where: { status: 'rejected' } }),
  ]);

  const referred: FunnelStats['referred'] = {};
  for (const broker of BROKER_KEYS) {
    referred[broker] = {
      count: await prisma.referredClient.count({ where: { broker } }),
      syncedAt: await latestSyncAt(broker),
    };
  }
  return { users, onboarded, pending, approved, rejected, referred };
}
