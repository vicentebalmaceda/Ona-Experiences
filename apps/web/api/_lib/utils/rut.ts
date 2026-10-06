/**
 * Chilean RUT helpers (modulo 11). BSale stores the RUT in the client `code`
 * attribute and asks integrators to validate it before sending.
 *
 * Mirrors apps/web/src/utils/rut.js, which the browser form uses.
 */

const RUT_PATTERN = /^(\d{7,8})-?([\dK])$/;

/** Strips dots and spaces, uppercases the check digit. Does not validate. */
export function normalizeRut(value: string): string {
  return value.replace(/[.\s]/g, '').toUpperCase();
}

function computeCheckDigit(body: string): string {
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
export function isValidRut(value: string): boolean {
  const match = RUT_PATTERN.exec(normalizeRut(value));
  if (!match) return false;
  const [, body, checkDigit] = match;
  return computeCheckDigit(body) === checkDigit;
}

/**
 * Returns the RUT as BSale expects it in `code` (`12345678-9`, no dots), or
 * null when the value is not a valid RUT.
 */
export function formatRutForBsale(value: string): string | null {
  const normalized = normalizeRut(value);
  if (!isValidRut(normalized)) return null;
  const match = RUT_PATTERN.exec(normalized)!;
  return `${match[1]}-${match[2]}`;
}
