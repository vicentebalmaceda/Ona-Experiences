import { describe, expect, it } from 'vitest';
import { inZone, zoneIds, zoneLabel } from './zones.js';

const t = (key) => `t:${key}`;

describe('zoneLabel', () => {
  it('translates known zone ids, numeric or string', () => {
    expect(zoneLabel(3, t)).toBe('t:zones.3');
    expect(zoneLabel('5', t)).toBe('t:zones.5');
  });

  it('joins several zones, from an array or a comma-separated string', () => {
    expect(zoneLabel([3, 4], t)).toBe('t:zones.3, t:zones.4');
    expect(zoneLabel('3, 4', t)).toBe('t:zones.3, t:zones.4');
  });

  it('shows unknown values as-is and empty for missing', () => {
    expect(zoneLabel('Coyhaique', t)).toBe('Coyhaique');
    expect(zoneLabel(9, t)).toBe('9');
    expect(zoneLabel(null, t)).toBe('');
    expect(zoneLabel([], t)).toBe('');
  });
});

describe('zoneIds / inZone', () => {
  it('normalizes single, array and comma-separated values', () => {
    expect(zoneIds(4)).toEqual(['4']);
    expect(zoneIds([3, 4])).toEqual(['3', '4']);
    expect(zoneIds('3,4,3')).toEqual(['3', '4']);
    expect(zoneIds(null)).toEqual([]);
  });

  it('matches any of an item\'s zones', () => {
    expect(inZone([3, 4], '4')).toBe(true);
    expect(inZone('3,4', 3)).toBe(true);
    expect(inZone(5, '4')).toBe(false);
  });
});
