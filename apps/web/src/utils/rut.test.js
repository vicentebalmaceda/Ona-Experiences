import { describe, expect, it } from 'vitest';
import { formatRut, isValidRut, normalizeRut } from './rut.js';

describe('normalizeRut', () => {
  it('strips dots and spaces and uppercases K', () => {
    expect(normalizeRut(' 12.345.605-k ')).toBe('12345605-K');
    expect(normalizeRut(null)).toBe('');
  });
});

describe('isValidRut', () => {
  it('accepts valid RUTs in any common spelling', () => {
    expect(isValidRut('12.345.678-5')).toBe(true);
    expect(isValidRut('123456785')).toBe(true);
    expect(isValidRut('12345605-k')).toBe(true);
    expect(isValidRut('6666600-K')).toBe(true);
    expect(isValidRut('12.345.613-0')).toBe(true);
  });

  it('rejects wrong check digits, emails and empty input', () => {
    expect(isValidRut('12.345.678-9')).toBe(false);
    expect(isValidRut('maria@example.com')).toBe(false);
    expect(isValidRut('')).toBe(false);
    expect(isValidRut(undefined)).toBe(false);
  });
});

describe('formatRut', () => {
  it('adds thousands dots and the hyphen', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
    expect(formatRut('6666600k')).toBe('6.666.600-K');
  });

  it('leaves malformed input untouched', () => {
    expect(formatRut('12-3')).toBe('12-3');
  });
});
