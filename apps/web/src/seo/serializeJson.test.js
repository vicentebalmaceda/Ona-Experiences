import { describe, expect, it } from 'vitest';
import { serializeJsonForScript } from './serializeJson.js';

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

describe('serializeJsonForScript (window.__ONA_DATA__ and JSON-LD)', () => {
  const value = {
    html: '</script><script>alert("x")</script><!-- & -->',
    separators: `a${LS}b${PS}c`,
    nested: [{ text: 'río & lago > mar < cielo' }]
  };

  it('escapes <, >, &, U+2028 and U+2029', () => {
    const json = serializeJsonForScript(value);
    expect(json).not.toMatch(/[<>&]/);
    expect(json).not.toContain(LS);
    expect(json).not.toContain(PS);
    expect(json).toContain('\\u003c/script\\u003e');
    expect(json).toContain('\\u0026');
    expect(json).toContain('a\\u2028b\\u2029c');
  });

  it('round-trips to the same value', () => {
    expect(JSON.parse(serializeJsonForScript(value))).toEqual(value);
    // As inline JavaScript too (what the browser evaluates).
    expect(new Function(`return ${serializeJsonForScript(value)};`)()).toEqual(value);
  });

  it('serializes undefined as null', () => {
    expect(serializeJsonForScript(undefined)).toBe('null');
  });
});
