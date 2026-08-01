import { describe, it, expect } from 'vitest';
import { validateName, validatePhone, validateUid, validateEmail, validateIdentifier } from '../src/lib/validate.js';

describe('validateName', () => {
  it('accepts a normal name and collapses whitespace', () => {
    expect(validateName('  John   Doe ')).toEqual({ ok: true, value: 'John Doe' });
  });
  it('rejects too-short / letterless input', () => {
    expect(validateName('J').ok).toBe(false);
    expect(validateName('123').ok).toBe(false);
    expect(validateName('   ').ok).toBe(false);
  });
});

describe('validatePhone', () => {
  it('accepts a spaced international number and normalizes it', () => {
    expect(validatePhone('+1 555 123 4567')).toEqual({ ok: true, value: '+15551234567' });
    expect(validatePhone('+91-89629-85422')).toEqual({ ok: true, value: '+918962985422' });
  });
  it('prepends + when the country code lacks it', () => {
    expect(validatePhone('442071234567')).toEqual({ ok: true, value: '+442071234567' });
  });
  it('rejects letters or too-short numbers', () => {
    expect(validatePhone('abc').ok).toBe(false);
    expect(validatePhone('12345').ok).toBe(false);
  });
});

describe('validateUid', () => {
  it('accepts a 4–20 char alphanumeric account number', () => {
    expect(validateUid(' 1234567 ')).toEqual({ ok: true, value: '1234567' });
    expect(validateUid('AB12CD34').ok).toBe(true);
  });
  it('rejects too-short or symbol-laden input', () => {
    expect(validateUid('12').ok).toBe(false);
    expect(validateUid('12-34').ok).toBe(false);
  });
});

describe('validateEmail', () => {
  it('accepts and lowercases a valid email', () => {
    expect(validateEmail('Me@Example.COM')).toEqual({ ok: true, value: 'me@example.com' });
  });
  it('rejects malformed emails', () => {
    expect(validateEmail('nope').ok).toBe(false);
    expect(validateEmail('a@b').ok).toBe(false);
  });
});

describe('validateIdentifier', () => {
  it('routes to the right validator by broker id type', () => {
    expect(validateIdentifier('email', 'a@b.co').ok).toBe(true);
    expect(validateIdentifier('uid', 'a@b.co').ok).toBe(false);
    expect(validateIdentifier('uid', '998877').ok).toBe(true);
  });
});
