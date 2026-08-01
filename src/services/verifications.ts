// Verification records — the audit + admin-decision row for one completed attempt.
import { prisma } from '../db/prisma.js';
import type { VerifyResult } from '../verify/verifier.js';

/**
 * Atomically record an admin decision. Only transitions a still-pending case
 * (so two admins tapping at once, or a double-tap, can't both "win"). Returns the
 * updated row, or null if it was already decided / not found.
 */
export async function decideVerification(id: string, status: 'approved' | 'rejected', adminId: bigint) {
  const res = await prisma.verification.updateMany({
    where: { id, status: 'pending_admin' },
    data: { status, decidedBy: adminId, decidedAt: new Date() },
  });
  if (res.count === 0) return null;
  return prisma.verification.findUnique({ where: { id } });
}

export function createPendingVerification(args: {
  userId: bigint;
  broker: string;
  identifier: string;
  facts: VerifyResult;
  screenshotFileId: string;
}) {
  const { userId, broker, identifier, facts, screenshotFileId } = args;
  return prisma.verification.create({
    data: {
      userId,
      broker,
      identifier,
      found: facts.found,
      deposits: facts.deposits,
      volumeLots: facts.volumeLots,
      eligible: facts.eligible,
      status: 'pending_admin',
      screenshotFileId,
    },
  });
}
