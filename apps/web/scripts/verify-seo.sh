#!/usr/bin/env bash
# Checks what crawlers get from a deployment (raw HTML, no JavaScript).
#
#   scripts/verify-seo.sh <base-url> [lodge-slug]
#   e.g. scripts/verify-seo.sh https://ona-experiences-git-seo-prerender.vercel.app
#        scripts/verify-seo.sh http://localhost:4173        (npm run serve:dist)
#
# Prints PASS/FAIL per check and exits non-zero when any check fails. The
# lodge defaults to the first /lodges/ URL in the sitemap. Needs curl and node.
# For a protected Vercel Preview, pass a bypass token through CURL_EXTRA, e.g.
#   CURL_EXTRA='-H x-vercel-protection-bypass:<token>' scripts/verify-seo.sh <url>
set -uo pipefail

BASE="${1:?usage: verify-seo.sh <base-url> [lodge-slug]}"
BASE="${BASE%/}"
SLUG="${2:-}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PASSED=0
FAILED=0
pass() { echo "PASS  $*"; PASSED=$((PASSED + 1)); }
fail() { echo "FAIL  $*"; FAILED=$((FAILED + 1)); }
check() { # check <description> <command...>
  local description="$1"
  shift
  if "$@"; then pass "$description"; else fail "$description"; fi
}

# fetch <name> <path>: body in $TMP/<name>.body, headers in $TMP/<name>.headers; prints the status.
fetch() {
  # shellcheck disable=SC2086
  curl -sS ${CURL_EXTRA:-} -o "$TMP/$1.body" -D "$TMP/$1.headers" -w '%{http_code}' "$BASE$2" 2>/dev/null || echo 000
}
header() { # header <name> <Header-Name>: last value of that header
  grep -i "^$2:" "$TMP/$1.headers" 2>/dev/null | tail -1 | cut -d: -f2- | tr -d '\r' | sed 's/^ *//'
}
status_is() { [ "$1" = "$2" ]; }
contains() { case "$1" in *"$2"*) return 0 ;; *) return 1 ;; esac; }

# --- HTML pages: 200 + text/html -------------------------------------------
html_page() { # html_page <name> <path>
  local status type
  status="$(fetch "$1" "$2")"
  type="$(header "$1" content-type)"
  check "$2 → 200 text/html (got $status, ${type:-no content-type})" \
    bash -c "[ '$status' = 200 ] && [[ '$type' == text/html* ]]"
}

html_page home_es /
html_page home_en /en
html_page about_es /quienes-somos
html_page about_en /en/about

# --- robots.txt and sitemap.xml ---------------------------------------------
status="$(fetch robots /robots.txt)"
type="$(header robots content-type)"
check "/robots.txt → 200 text/plain (got $status, ${type:-none})" \
  bash -c "[ '$status' = 200 ] && [[ '$type' == text/plain* ]]"

status="$(fetch sitemap /sitemap.xml)"
type="$(header sitemap content-type)"
check "/sitemap.xml → 200 XML (got $status, ${type:-none})" \
  bash -c "[ '$status' = 200 ] && [[ '$type' == *xml* ]] && grep -q '<urlset' '$TMP/sitemap.body'"

if [ -z "$SLUG" ]; then
  SLUG="$(grep -o '<loc>[^<]*/lodges/[^<]*</loc>' "$TMP/sitemap.body" | head -1 | sed -E 's#.*/lodges/([^<]*)</loc>#\1#')"
fi
if [ -z "$SLUG" ]; then
  fail "no lodge slug given and none found in /sitemap.xml; lodge checks skipped"
  echo
  echo "$PASSED passed, $FAILED failed"
  exit 1
fi
PRODUCT_ID="$(echo "$SLUG" | grep -oE '[0-9]+$')"
echo "      (lodge: /lodges/$SLUG, productId ${PRODUCT_ID:-?})"

check "/sitemap.xml lists /lodges/$SLUG" grep -q "/lodges/$SLUG</loc>" "$TMP/sitemap.body"

# --- Lodge pages ------------------------------------------------------------
html_page lodge_es "/lodges/$SLUG"
html_page lodge_en "/en/lodges/$SLUG"

status="$(fetch lodge_api "/api/v1/lodges/$PRODUCT_ID")"
type="$(header lodge_api content-type)"
check "/api/v1/lodges/$PRODUCT_ID → 200 JSON (got $status)" \
  bash -c "[ '$status' = 200 ] && [[ '$type' == application/json* ]]"

# Raw-HTML checks of the lodge pages, against the API's own item.
node - "$TMP" "$SLUG" > "$TMP/lodge-checks.out" 2>&1 <<'JS'
const fs = require('fs');
const [dir, slug] = process.argv.slice(2);
const read = name => { try { return fs.readFileSync(`${dir}/${name}.body`, 'utf8'); } catch { return ''; } };
const es = read('lodge_es');
const en = read('lodge_en');
let item = {};
try { item = JSON.parse(read('lodge_api')); } catch {}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í',
  oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  Ntilde: 'Ñ', iexcl: '¡', iquest: '¿', ordm: 'º', ordf: 'ª', deg: '°', ndash: '–', mdash: '—', hellip: '…',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, c) =>
  c[0] === '#' ? String.fromCodePoint(c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) : (NAMED[c] ?? m));
const text = html => decode(String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (html, re) => { const m = re.exec(html); return m ? decode(m[1]) : null; };

const results = [];
const check = (ok, label) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
const name = item.name || '';

const h1 = attr(es, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
check(Boolean(name) && h1 !== null && text(h1) === name, `es lodge <h1> is the lodge name ("${name}"; got "${h1 === null ? 'no h1' : text(h1)}")`);

const description = text(item.description);
const chunk = description.slice(0, 100);
check(chunk.length >= 100 && text(es).includes(chunk),
  `es lodge raw HTML contains 100 chars of the description${chunk.length < 100 ? ` (API description too short: ${description.length} chars)` : ''}`);

const title = attr(es, /<title>([\s\S]*?)<\/title>/i) || '';
check(Boolean(name) && title.includes(name), `es lodge <title> names the lodge ("${title}")`);

const canonical = attr(es, /<link rel="canonical" href="([^"]+)"/i) || '';
check(canonical.endsWith(`/lodges/${slug}`), `es lodge canonical → /lodges/${slug} ("${canonical}")`);
check(/<link rel="alternate" hreflang="es" href="[^"]*\/lodges\//i.test(es) && /hreflang="x-default"/i.test(es), 'es lodge has hreflang es + x-default');
check(/<meta name="robots" content="index/i.test(es), 'es lodge is indexable (meta robots index)');

const ogImage = attr(es, /<meta property="og:image" content="([^"]+)"/i) || '';
check(/^https?:\/\//.test(ogImage), `es lodge og:image is absolute ("${ogImage}")`);

const blocks = [...es.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => {
  try { return JSON.parse(m[1]); } catch { return {}; }
});
const business = blocks.find(b => b['@type'] === 'LodgingBusiness');
check(Boolean(business), `es lodge JSON-LD has a LodgingBusiness (types: ${blocks.map(b => b['@type']).join(', ') || 'none'})`);
const rating = Number(item.reviews || 0);
check(rating >= 1 ? Boolean(business?.aggregateRating) : !business?.aggregateRating,
  `es lodge aggregateRating ${rating >= 1 ? 'present' : 'absent'} for ${rating} visible review(s)`);
check(es.includes('window.__ONA_DATA__='), 'es lodge embeds window.__ONA_DATA__');

check(/<meta name="robots" content="noindex/i.test(en), 'en lodge is noindex');
check(!/application\/ld\+json/i.test(en), 'en lodge has no JSON-LD');
const enH1 = attr(en, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
check(enH1 !== null && text(enH1) === name, 'en lodge <h1> is the lodge name');

console.log(results.join('\n'));
JS
if [ ! -s "$TMP/lodge-checks.out" ]; then
  fail "lodge HTML checks did not run"
fi
while IFS= read -r line; do
  case "$line" in
    PASS*) echo "$line"; PASSED=$((PASSED + 1)) ;;
    FAIL*) echo "$line"; FAILED=$((FAILED + 1)) ;;
    *) [ -n "$line" ] && { echo "FAIL  lodge checks: $line"; FAILED=$((FAILED + 1)); } ;;
  esac
done < "$TMP/lodge-checks.out"

# --- Legacy id URL ------------------------------------------------------------
if [ -n "$PRODUCT_ID" ] && [ "$PRODUCT_ID" != "$SLUG" ]; then
  status="$(fetch legacy "/lodges/$PRODUCT_ID")"
  check "/lodges/$PRODUCT_ID (legacy id) → 200 (got $status)" status_is "$status" 200
  check "/lodges/$PRODUCT_ID has a canonical to /lodges/$SLUG" \
    grep -Eq "<link rel=\"canonical\" href=\"[^\"]*/lodges/$SLUG\"" "$TMP/legacy.body"
  check "/lodges/$PRODUCT_ID redirects (meta refresh) and is noindex" \
    bash -c "grep -q 'http-equiv=\"refresh\"' '$TMP/legacy.body' && grep -q 'content=\"noindex' '$TMP/legacy.body'"
fi

# --- Real 404s ----------------------------------------------------------------
status="$(fetch missing_es /no-existe)"
check "/no-existe → 404 (got $status)" status_is "$status" 404
check "/no-existe serves the not-found page with a link to /en" grep -q 'href="/en"' "$TMP/missing_es.body"
status="$(fetch missing_en /en/no-existe)"
check "/en/no-existe → 404 (got $status)" status_is "$status" 404

# --- Client-only routes: 200 + X-Robots-Tag noindex ---------------------------
for path in /admin /review; do
  name="spa_${path//\//}"
  status="$(fetch "$name" "$path")"
  robots="$(header "$name" x-robots-tag)"
  check "$path → 200 with X-Robots-Tag noindex (got $status, '${robots:-none}')" \
    bash -c "[ '$status' = 200 ] && [[ '$robots' == *noindex* ]]"
done

# --- API and health still served ------------------------------------------------
status="$(fetch api_lodges /api/v1/lodges)"
type="$(header api_lodges content-type)"
check "/api/v1/lodges → 200 JSON with items (got $status, ${type:-none})" \
  bash -c "[ '$status' = 200 ] && [[ '$type' == application/json* ]] && grep -q '\"items\"' '$TMP/api_lodges.body'"
status="$(fetch health /health)"
check "/health → 200 (got $status)" status_is "$status" 200

echo
echo "$PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
