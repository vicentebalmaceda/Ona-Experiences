import { describe, expect, it } from 'vitest';
import { zoneLabel } from './zones.js';

const t = (key) => `t:${key}`;

describe('zoneLabel', () => {
  it('translates known zone ids, numeric or string', () => {
    expect(zoneLabel(3, t)).toBe('t:zones.3');
    expect(zoneLabel('5', t)).toBe('t:zones.5');
  });

  it('shows unknown values as-is and empty for missing', () => {
    expect(zoneLabel('Coyhaique', t)).toBe('Coyhaique');
    expect(zoneLabel(9, t)).toBe('9');
    expect(zoneLabel(null, t)).toBe('');
  });
});
