// User domain service. The bot_user row itself is ensured by the session
// middleware; these helpers carry the funnel-specific mutations/reads.
import { prisma } from '../db/prisma.js';

export function getUser(id: bigint) {
  return prisma.botUser.findUnique({ where: { id } });
}

export async function isOnboarded(id: bigint): Promise<boolean> {
  const u = await prisma.botUser.findUnique({ where: { id } });
  return u?.onboardedAt != null;
}

/** Onboarding step 1 — record the name. */
export function setName(id: bigint, name: string) {
  return prisma.botUser.update({ where: { id }, data: { name } });
}

/** Onboarding step 2 — record the phone and stamp onboardedAt (marks it complete). */
export function completeOnboarding(id: bigint, phone: string) {
  return prisma.botUser.update({ where: { id }, data: { phone, onboardedAt: new Date() } });
}

export function setContactShared(id: bigint) {
  return prisma.botUser.update({ where: { id }, data: { contactShared: true } });
}
