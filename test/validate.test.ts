import { describe, it, expect } from 'vitest';
import { validateName, validatePhone } from '../src/lib/validate.js';

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
