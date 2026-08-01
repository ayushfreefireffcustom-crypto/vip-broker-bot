// Verification records — the audit + admin-decision row for one completed attempt.
import { prisma } from '../db/prisma.js';
import type { VerifyResult } from '../verify/verifier.js';

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
