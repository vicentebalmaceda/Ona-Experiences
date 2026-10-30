# SEO implementation plan

Companion to [seo-deep-dive.md](./seo-deep-dive.md). Status: **implemented** on `Feat/seo` (phases 0–4; phase 6 content is still open).

## Guardrails

These shape every step.

- **No new serverless functions.** The project has 3: `api/v1/index.ts`, `api/webhooks/bsale.ts` and `api/health.ts`. Any backend need is a new *route inside* the `v1` router or a change to the existing webhook.
- **Static-first on Vercel.** SEO pages become **prerendered static HTML** in `dist/`, generated during `vite build`. Vercel serves files from the filesystem before it applies `rewrites`, so crawlers get full HTML from the CDN with zero function invocations. The SPA keeps hydrating on top of that HTML and keeps calling `/api/v1` for fresh data.
- **No framework migration.** Moving to React Router framework mode or Next would change Vercel's output layout. That is the main risk you flagged. The plan instead uses Vite's standard SSR-prerender pattern (`vite build --ssr` + a Node script), so `vercel.json` and the output directory stay the same.
- **Every risky change is proven on a Vercel Preview deployment before merge.** A scripted `curl` checklist covers status codes, headers, robots, sitemap, hreflang and canonical, and Lighthouse runs against the preview URL.

## Routing and i18n design

The language comes from the URL, and only from the URL.

| Page | Spanish (default, `x-default`) | English |
|---|---|---|
| Home | `/` | `/en` |
| About | `/quienes-somos` | `/en/about` |
| Lodge | `/lodges/{slug}` | `/en/lodges/{slug}` |
| Guide | `/guides/{slug}` | `/en/guides/{slug}` |
| Region hub (phase 6) | `/pesca-con-mosca/{region}` | `/en/fly-fishing/{region}` |
| Review / Admin | `/review`, `/admin/*` (`noindex`, Spanish-only) | — |

- **One route table** in `src/routes.js` maps each page id to `{ es, en }` path patterns. These helpers all read from it:
  - `localizePath(pageId, lang, params)`
  - `alternatesFor(location)` (feeds hreflang and the language switcher)
  - the prerender's URL list
  - the sitemap
- **A `<LocaleLayout lang>` route wrapper** calls `i18n.changeLanguage(lang)` and is the only place the language is set. `LanguageDetector` is removed from content selection. No auto-redirects ever happen, because Googlebot must see stable URLs.
- **The language switcher** in `Header.jsx` navigates to the *equivalent page* in the other language using `alternatesFor`. It stops calling `changeLanguage` directly.
- **Links:** all internal `<Link to>` / `href` values go through `localizePath` (or a `useLocalizedPath()` hook), so English pages link to English pages. That includes `Header`, `DirectoryCard`, `utils/map.js` popups and the back-links.
- **SEO strings** live in the existing locale files under a new `seo.*` namespace, with interpolation, e.g. `seo.lodge.title: "{{name}} – Lodge de pesca con mosca en {{zone}} | ONA"`. Translators work in one place.
- **Server-side i18n:** the prerender creates a fresh i18next instance per language with the same JSON resources (no detector), so server HTML and client hydration produce identical text.
- **Slugs:** a shared `slugify(name)` in `apps/web/shared/` is used by both client and build. A collision appends the product id. Old `/lodges/{id}` URLs get a tiny prerendered page with `canonical` and a meta-refresh to the slug, so no function is needed.

## Phases

Each phase is one branch with one PR into `main`, so you can review and ship incrementally. Phases 2 and 3 run in parallel in separate worktrees because they touch different files.

### Phase 0: Baseline (coordinator, no code)
- Run Lighthouse (mobile + desktop) on production for `/`, a lodge page and `/quienes-somos`, and save the JSON/HTML reports under `docs/seo/lighthouse/baseline/`.
- Give you a short checklist of dashboard steps only you can do:
  - verify the domain in Google Search Console and Bing
  - switch the apex domain redirect to permanent (308)
  - create a Vercel Deploy Hook and store it as the `VERCEL_DEPLOY_HOOK_URL` env var

### Phase 1: Quick wins (subagent, branch `seo/quick-wins`, small PR)
- `public/robots.txt` disallowing `/admin`, `/review` and `/api/`, with a sitemap line (the sitemap itself arrives in phase 4).
- `vercel.json` `headers`: `X-Robots-Tag: noindex` on `/admin/(.*)` and `/review`.
- Better static `<title>`/description in `index.html` and the locale files. Hero H1 with the keyword, keeping the tagline as a sub-line.
- Lighthouse SEO fixes:
  - descriptive link text ("Ver detalle" → "Ver Bío Bío River Lodge")
  - meaningful `alt` text
  - `theme-color`
- **Expected Lighthouse effect:** SEO score improvement and a valid robots.txt.

### Phase 2: Performance (subagent, branch `seo/perf`, own worktree, parallel with phase 3)
- `React.lazy` for `AdminApp`, and lazy-load Leaflet components and CSS (map sections render a placeholder until visible). Target: public JS < 350 KB.
- Build-time image pipeline (`sharp` script or `vite-imagetools`): WebP + 2–3 widths for `public/assets/**`, `srcset`/`sizes`, explicit `width`/`height`, `loading="lazy"` below the fold, and `fetchpriority="high"` on the hero/poster.
- Self-host the fonts (`@fontsource`) with `font-display: swap` and preload the one or two critical files.
- Blob-hosted hero (admin-uploaded): add a compression step in the existing admin upload route (no new function).
- **Expected Lighthouse effect:** Performance (LCP, TBT, total bytes).

### Phase 3: Locale routing (subagent, branch `seo/i18n-routes`, own worktree)
- Implements the routing and i18n design above: the route table, `LocaleLayout`, switcher, localized links, `seo.*` strings and slugs.
- Still client-rendered at this point, but URLs, hreflang targets and `<html lang>` are now correct.
- Unit tests for `localizePath`, `alternatesFor` and `slugify`.

### Phase 4: Prerender + head + sitemap (subagent, branch `seo/prerender`, on top of phase 3)
- `src/entry-server.jsx` with `renderToString` + `StaticRouter`, and `src/main.jsx` switched to `hydrateRoot`.
- **Initial data handoff:** the build script fetches the catalog by **calling the BSale service code in-process** (`api/_lib` services), with the env vars that are already available at build. It does not call our own deployed API. The page gets `window.__ONA_DATA__` and `ProductDetailPage`/`LandingPage` initialize from it, so there's no loading flash and no hydration mismatch. They still revalidate from `/api/v1` after mount. If BSale is down at build, the build **fails** rather than shipping empty pages, and Vercel keeps serving the previous deployment.
- **Head manager** (a small in-house `<Seo>` component, or `react-helmet-async`). It writes, per page:
  - `title`, description and `canonical`
  - `hreflang` es/en/x-default
  - OG/Twitter tags with the lodge photo
  - JSON-LD: `Organization` + `WebSite` on home, `LodgingBusiness` + `aggregateRating` (Visible Reviews only) + `BreadcrumbList` on lodges
- **Prerender script** writes `dist/**/{page}.html` for every route × language, plus `dist/sitemap.xml` (with hreflang alternates) and `dist/404.html`.
- **`vercel.json`:**
  - `cleanUrls: true`, `trailingSlash: false`
  - the catch-all rewrite is **removed**
  - explicit rewrites only for client-only routes (`/admin/(.*)`, `/review`)
  - `/lodges/:slug` and `/en/lodges/:slug` fall back to a `spa.html` shell carrying `noindex`, so a lodge added since the last build still works for humans but isn't indexed until the next deploy
  - everything else gets a real **404**
- **Freshness:** the existing BSale webhook (and a "Republicar sitio" button in the admin, as a route inside `v1`) calls the Deploy Hook. A daily GitHub Actions cron also pings the hook. No new functions.
- **Preview-deploy verification script** (`scripts/verify-seo.sh <url>`): asserts status codes, content types, `X-Robots-Tag`, `<title>`/canonical/hreflang per URL, a valid sitemap and real 404s.

### Phase 5: Verify and measure (coordinator)
- Run the verify script and Lighthouse against the Vercel Preview of each PR, then production after merge. Compare to the baseline in `docs/seo/lighthouse/`.
- You submit the sitemap in GSC and request indexing for the home page and lodge pages.

### Phase 6: Content (optional, after you approve copy)
- Region hub template, with 4 hubs drafted from your lodges' own descriptions and the zones in `zones.js`. Drafts are for your review and edit; nothing is published as invented fact.
- English lodge descriptions. Decision needed:
  - **(a)** a `description_en` column + admin editor (a route inside `v1`)
  - **(b)** machine-translate at build and store for review
  - **(c)** English lodge pages `noindex` until translated

  Default: (c) in phase 4, then (a).

## How I'll coordinate

- Each implementation phase is a **subagent in its own git worktree and branch**, briefed with the routing and i18n design and the guardrails above. When it reports back, I review the diff, run `npm run test`, `typecheck` and `build`, and run the verify script against a local `vite preview` build.
- I report to you at each phase boundary with what changed, the test and build output, and the PR link. **I won't push branches or open PRs without your OK**, and I won't touch Vercel or GSC settings. Those steps are yours.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Vercel serves the wrong file or 404s on clean URLs | `cleanUrls` + verify script on a Preview before merge; the catch-all is removed only in phase 4, on preview |
| Hydration mismatch | Same i18n resources and same `__ONA_DATA__` on server and client; a CI test renders each route server-side |
| Build depends on BSale | The build fails loudly, so the previous deployment stays live; retry via the Deploy Hook |
| Stale prerendered content | Webhook/admin/cron Deploy Hook; client revalidates on mount anyway |
| Leaflet/`window` on the server | Map components are client-only (lazy and guarded) |
| Existing links to `/lodges/{id}` and English users who relied on auto-detection | Redirect pages for ids; a non-redirecting "View in English" banner for `en` browsers on Spanish pages |
