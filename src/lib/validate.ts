// Pure input validators (no I/O) — trivially unit-testable. Used by the onboarding
// and broker-identifier steps.

export type Validated = { ok: true; value: string } | { ok: false };

/** A person's name: 2–80 chars, collapsed whitespace, at least one letter. */
export function validateName(raw: string): Validated {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (value.length < 2 || value.length > 80) return { ok: false };
  if (!/[A-Za-zÀ-ɏ]/.test(value)) return { ok: false };
  return { ok: true, value };
}

/** Phone with country code. Strips spaces/dashes/parens; needs 8–15 digits.
 *  A leading + is normalized in (assumed present per the prompt "with country code"). */
export function validatePhone(raw: string): Validated {
  const stripped = raw.replace(/[\s\-()]/g, '');
  if (!/^\+?\d{8,15}$/.test(stripped)) return { ok: false };
  return { ok: true, value: stripped.startsWith('+') ? stripped : `+${stripped}` };
}
