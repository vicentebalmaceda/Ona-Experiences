/**
 * JSON for an inline <script> (JSON-LD, the prerender's window.__ONA_DATA__).
 *
 * JSON.stringify output is valid JavaScript but not safe inside HTML: a
 * string containing `</script>` or `<!--` would end or confuse the script
 * element. Escaping `<`, `>` and `&` as backslash-u003c/003e/0026 keeps the
 * value identical once parsed. U+2028/U+2029 (LINE/PARAGRAPH SEPARATOR) are
 * escaped as well: legal in JSON, but line terminators in older JavaScript.
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const ESCAPES = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  [LINE_SEPARATOR]: '\\u2028',
  [PARAGRAPH_SEPARATOR]: '\\u2029'
};

const UNSAFE = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, 'g');

export function serializeJsonForScript(value) {
  return JSON.stringify(value ?? null).replace(UNSAFE, (char) => ESCAPES[char]);
}
