import { describe, expect, it } from 'vitest';
import { formatRutForBsale, isValidRut, normalizeRut } from './rut.js';

describe('normalizeRut', () => {
  it('removes dots and spaces and uppercases the check digit', () => {
    expect(normalizeRut(' 12.345.605-k ')).toBe('12345605-K');
  });
});

describe('isValidRut', () => {
  it('accepts valid RUTs with and without dots or hyphen', () => {
    expect(isValidRut('12.345.678-5')).toBe(true);
    expect(isValidRut('12345678-5')).toBe(true);
    expect(isValidRut('123456785')).toBe(true);
    expect(isValidRut('11111111-1')).toBe(true);
    expect(isValidRut('6.666.666-2')).toBe(true);
    expect(isValidRut('12.345.613-0')).toBe(true);
  });

  it('accepts a lowercase or uppercase K check digit', () => {
    expect(isValidRut('12.345.605-k')).toBe(true);
    expect(isValidRut('12345605-K')).toBe(true);
    expect(isValidRut('6666600-K')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(isValidRut('12.345.678-9')).toBe(false);
    expect(isValidRut('11111111-2')).toBe(false);
    expect(isValidRut('12345605-1')).toBe(false);
  });

  it('rejects malformed values and emails', () => {
    expect(isValidRut('')).toBe(false);
    expect(isValidRut('abc')).toBe(false);
    expect(isValidRut('maria@example.com')).toBe(false);
    expect(isValidRut('1-9')).toBe(false);
    expect(isValidRut('123456789-0')).toBe(false);
  });
});

describe('formatRutForBsale', () => {
  it('returns the dotless hyphenated form BSale stores in `code`', () => {
    expect(formatRutForBsale('12.345.678-5')).toBe('12345678-5');
    expect(formatRutForBsale('123456785')).toBe('12345678-5');
    expect(formatRutForBsale('12.345.605-k')).toBe('12345605-K');
  });

  it('returns null for invalid input', () => {
    expect(formatRutForBsale('12.345.678-9')).toBeNull();
    expect(formatRutForBsale('maria@example.com')).toBeNull();
  });
});
