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

/** Finish onboarding: record name + phone and stamp onboardedAt. */
export function completeOnboarding(id: bigint, name: string, phone: string) {
  return prisma.botUser.update({ where: { id }, data: { name, phone, onboardedAt: new Date() } });
}

export function setContactShared(id: bigint) {
  return prisma.botUser.update({ where: { id }, data: { contactShared: true } });
}
