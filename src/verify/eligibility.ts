// Pure eligibility check — no I/O. A client is eligible when they've funded at
// least the minimum deposit and traded at least the minimum volume. Reasons are
// collected for the admin card / logs.
export interface Thresholds {
  minDeposit: number;
  minVolume: number;
}

export interface AccountFacts {
  deposits: number | null;
  volumeLots: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export function checkEligibility(facts: AccountFacts, t: Thresholds): EligibilityResult {
  const reasons: string[] = [];
  if (facts.deposits == null || facts.deposits < t.minDeposit) {
    reasons.push(`deposit below $${t.minDeposit}`);
  }
  if (facts.volumeLots == null || facts.volumeLots < t.minVolume) {
    reasons.push(`volume below ${t.minVolume} lots`);
  }
  return { eligible: reasons.length === 0, reasons };
}
