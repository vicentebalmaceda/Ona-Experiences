/**
 * Chilean RUT helpers (modulo 11) for the browser.
 * Mirrors apps/web/api/_lib/utils/rut.ts, which the BFF uses to validate the
 * same value before sending it to BSale.
 */

const RUT_PATTERN = /^(\d{7,8})-?([\dK])$/;

/** Strips dots and spaces, uppercases the check digit. Does not validate. */
export function normalizeRut(value) {
  return String(value || '').replace(/[.\s]/g, '').toUpperCase();
}

function computeCheckDigit(body) {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/** True when the value is a well-formed RUT whose check digit verifies. */
export function isValidRut(value) {
  const match = RUT_PATTERN.exec(normalizeRut(value));
  if (!match) return false;
  return computeCheckDigit(match[1]) === match[2];
}

/** Formats a RUT as `12.345.678-9` for display; returns the input untouched when malformed. */
export function formatRut(value) {
  const match = RUT_PATTERN.exec(normalizeRut(value));
  if (!match) return value;
  const body = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${match[2]}`;
}
