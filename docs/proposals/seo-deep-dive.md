# SEO deep dive: getting ONA Experiences indexed for "fly fishing in Chile"

_Audit date: 2026-10-30. Audited `main` @ `eec8115` and the live site at https://www.onaexperiences.com._

**Goal:** Google should index ONA Experiences and rank it for searches about fly fishing in Chile, in Spanish ("pesca con mosca en Chile", "lodge de pesca Aysén") and in English ("fly fishing Chile", "Patagonia fly fishing lodge").

## TL;DR

The site has good raw material. Each of the 11 live lodges has 1–20k characters of Spanish description, plus coordinates, photos and verified reviews. **Almost none of it reaches a crawler**, for these reasons:

1. **It is a client-only React SPA.** Every URL serves the same empty `<div id="root"></div>` with one global title. Google has to queue the page for JS rendering, and the content then loads from `/api/v1`. Bing, social previews and AI crawlers see nothing.
2. **Every URL returns 200 with the same HTML.** That includes `/robots.txt`, `/sitemap.xml` and made-up paths. There is no robots file, no sitemap, and every unknown URL is a soft 404.
3. **The language depends on the browser, not the URL.** Googlebot renders with `navigator.language = en-US`, so Google probably sees the English UI on `lang="es"` pages. Spanish and English can't both rank.
4. **There are no keyword-targeted pages.** The H1 is "Tu próxima aventura de pesca comienza aquí". No page targets a region, river, season or species, and detail URLs are numeric (`/lodges/2007`).

A quick `site:onaexperiences.com` search found no indexed pages. Confirm this in Google Search Console (step 0 below).

Fixing items 1–3 is engineering work of roughly one to two weeks. Item 4 is ongoing content work, and it's what actually wins the "any interest in fly fishing in Chile" searches.

---

## What I found

### Rendering and crawlability

| Check | Result | Where |
|---|---|---|
| Server HTML for `/` | Empty `#root` and static title/description only | `apps/web/index.html` |
| Server HTML for `/lodges/2007` | Same as `/`, with the homepage title | `vercel.json` catch-all rewrite |
| Lodge content | Fetched client-side from `/api/v1/lodges/:id` after mount | `src/pages/ProductDetailPage.jsx:50` |
| Per-page `<title>` / description | One global value set in `useEffect`, the same on every route | `src/components/DocumentMeta.jsx` |
| `canonical`, Open Graph, Twitter cards | None | — |
| Structured data (JSON-LD) | None | — |
| `/robots.txt` | **200 `text/html`** (the SPA shell) | live |
| `/sitemap.xml` | **200 `text/html`** | live |
| `/no-existe` | **200** (soft 404) | live |
| Unknown lodge id | Renders the "load error" UI with status 200 | `ProductDetailPage.jsx:93` |
| `/admin`, `/review` | Crawlable and indexable | `src/App.jsx` |
| `onaexperiences.com` → `www` | **307** (temporary). Should be 308/301 | Vercel domain config |
| Internal links | Cards use real `<a href>` via `<Link>`, which is good. Map popups also use `<a href>` | `DirectoryCard.jsx:52`, `utils/map.js:39` |
| JS bundle | **~970 KB**, one chunk containing admin, Leaflet and i18n | live `/assets/index-*.js` |
| Images | 300–600 KB JPGs, 28 MB in `public/assets/lodges`, no `srcset`/WebP/`width`/`height` | `public/assets` |
| Analytics | None found | — |

Google *can* render JS SPAs, but rendering is deferred and budgeted. A page whose content arrives through a second API call after hydration often gets indexed thin or not at all, especially on a new domain with no authority. Everything else (Bing, which also feeds ChatGPT/Copilot search, WhatsApp/Facebook link previews, Perplexity) gets an empty page.

### Language (es / en)

- `src/i18n/index.js` detects the language from `localStorage` and then `navigator`. Both languages live on **the same URL**.
- Google's renderer reports `en-US`, so the indexed text is likely the English UI, while `<html lang="es">` in the shell says Spanish.
- No `hreflang`. Google can index only one version per URL, so you can't rank in both languages.
- BSale lodge descriptions are **Spanish only**. An English page would currently be English chrome around Spanish content.

### On-page and keywords

- **Home title:** "ONA Experiences | Mapa de Lodges y Guías". It lacks "pesca con mosca", "Chile" and "Patagonia", the words people actually search.
- **Home H1:** "Tu próxima aventura de pesca comienza aquí." It's emotional with no keyword. Keep the tagline as the H1's sub-line, but put the target phrase in the H1.
- **Detail pages:** the title is identical to the home title. The H1 is the lodge name, which is good. The description content is strong, with places, rivers and species.
- **URLs:** `/lodges/2007` carries no keyword. `/lodges/bio-bio-river-lodge` (or `/lodges/2007-bio-bio-river-lodge`) is better.
- **Guides:** the live API returns **0 guides**, so the guides section is empty or thin.
- **Alt text:** the hero defaults to `alt=""`. Gallery and lodge images use the lodge name only. Add place and activity, e.g. "Pesca con mosca en el río Bío Bío, Lonquimay".
- **Zones** already exist in code (`zones.1–5`: Zona Central, Araucanía, Los Lagos, Patagonia norte, Patagonia sur), but they have no pages of their own. These map directly onto how people search.

### Competitive landscape

The English commercial searches ("fly fishing Chile", "Chile fly fishing lodges") are dominated by US outfitters and agencies: Orvis, Yellow Dog, Montana Angler, Trident, Eleven and Aardvark McLeod. They organize content by **region** (northern Patagonia / Palena–Yelcho, Aysén / Coyhaique, Magallanes / Tierra del Fuego), **season** (Nov–Apr) and **lodge**. Several of ONA's lodges (Matapiojo, Green Baker) are listed on Orvis.

The Spanish searches are much weaker, mostly aggregators and tourism portals (GoChile, InterPatagonia, Chile Nativo, FishingBooker) plus many Argentine results. **Spanish-language Chile fly fishing is the most winnable space right now.** ONA's real differentiators:

- local and Chile-based
- covers both lodges and guides
- verified guest reviews
- a map

Sources: [Yellow Dog – Chile fly fishing](https://www.yellowdogflyfishing.com/blogs/back-stage-pass/chile-fly-fishing), [Montana Angler – first-timer's guide to Chile](https://www.montanaangler.com/montana-fly-fishing-blog/first-time-traveling-anglers-destination-guide-fly-fishing-chile), [Orvis – Matapiojo Lodge](https://www.orvis.com/product/matapiojo-lodge-chile/3KJJ.html), [Trident – Chile lodges](https://www.tridentflyfishing.com/collections/chile-fly-fishing-lodges), [GoChile – fly fishing en Patagonia](https://www.gochile.cl/es/articulos/fly-fishing-en-patagonia-solo-para-fanaticos-o-deporte-de-moda.htm), [InterPatagonia – Koon Outfitters](https://www.interpatagonia.com/coihaique/c29249.html).

---

## Recommendations (in priority order)

### 0. Measure first (½ day, no code)

- Verify the domain in **Google Search Console** (DNS TXT, domain property) and **Bing Webmaster Tools** (it can import from GSC).
- Run URL Inspection on `/` and `/lodges/2007` and look at the rendered HTML and screenshot. This confirms what Google actually sees, including the language question.
- Add privacy-friendly analytics, such as Vercel Web Analytics plus Speed Insights. That gives you real Core Web Vitals data.

### P0. Make every public page return real HTML (biggest win)

The project already uses **React Router v7**, which has a framework mode with `prerender` and SSR on Vercel. Two viable paths:

**A. Build-time prerender (recommended for now).** The catalog is small (11 lodges) and changes rarely.
- At build time, fetch the catalog from the BSale-backed API and prerender `/`, `/quienes-somos`, each `/lodges/:slug`, `/guides/:slug` and each region page into static HTML. That HTML holds the full description, reviews, meta and JSON-LD.
- Trigger a **Vercel Deploy Hook** when a product changes. Call it from the existing BSale webhook handler, or from a daily Vercel Cron as a fallback.
- Result: fast static pages, crawlable by everyone, still hydrated into the current interactive React app.

**B. SSR via React Router framework mode on Vercel Functions.** Choose this if the catalog becomes large or changes often. It is more moving parts. Admin stays client-only either way.

Minimum alternative if neither is feasible soon: a Vercel Function at `/lodges/:id` that fetches the product and injects `<title>`, description, canonical, OG and JSON-LD, plus a `<noscript>`/pre-rendered text block, into `index.html`. This is better than today but a half-measure.

### P0. Fix HTTP semantics and crawl files

- **`robots.txt`**: a static file in `public/`:
  ```
  User-agent: *
  Disallow: /admin
  Disallow: /review
  Disallow: /api/
  Sitemap: https://www.onaexperiences.com/sitemap.xml
  ```
- **`sitemap.xml`**: generate it at build time (with path A) or serve it from a function, listing home, about, every lodge, guide and region page, and every content page, with `hreflang` alternates and `lastmod`.
- **Real 404s**: narrow the catch-all rewrite in `vercel.json` to known route patterns, or make the prerender emit a `404.html` and return 404 for unknown slugs. Unknown products must return 404, not a 200 error UI.
- **`noindex`** on `/admin/*` and `/review` (meta tag plus `X-Robots-Tag` header in `vercel.json`).
- **Apex redirect**: set `onaexperiences.com` → `www` to a **permanent** (308) redirect in Vercel Domains.

### P0. Language in the URL with hreflang

- Spanish at `/` (default, matches the market and the BSale content) and English at `/en/...`.
- Each page gets `<html lang>`, `<link rel="alternate" hreflang="es">`, `hreflang="en"` and `hreflang="x-default"`.
- Keep `navigator` detection only to *suggest* switching, e.g. a banner. Never swap content silently on the same URL.
- **English content:** translate lodge descriptions with an `en` field per Product (stored in ONA's DB, editable in admin). Until a lodge has a translation, don't publish its English page, or mark that page `noindex`. A thin English page is worse than none.

### P1. Per-page metadata

Templates (ES / EN):

| Page | `<title>` | H1 |
|---|---|---|
| Home | Lodges y guías de pesca con mosca en Chile y la Patagonia \| ONA | Lodges y guías de pesca con mosca en Chile |
| Lodge | {Name} – Lodge de pesca con mosca en {Comuna}, {Región} \| ONA | {Name} |
| Region | Pesca con mosca en {Región}: lodges, ríos y temporada \| ONA | Pesca con mosca en {Región} |
| Home (EN) | Fly Fishing Lodges & Guides in Chile and Patagonia \| ONA | Fly fishing lodges and guides in Chile |

- Write a unique 140–160 character meta description per page, generated from the lodge's lead paragraph.
- Add `canonical`, `og:title`/`og:description`/`og:image` (the lodge's first photo, 1200×630) and `og:locale` + `og:locale:alternate`.
- **Slugs:** `/lodges/bio-bio-river-lodge`. Store the slug on the Product, and 301 old numeric URLs to it.

### P1. Structured data (JSON-LD)

- **Home:** `Organization` (name, logo, `sameAs`: Instagram and onaflyfishing.cl), `WebSite`, and an `ItemList` of lodges.
- **Lodge page:** `LodgingBusiness` with `name`, `description`, `image[]`, `geo`, `address` (comuna and region), `priceRange` if known, and `aggregateRating` + `review[]` from **Visible Reviews**. ONA reviews third-party lodges, so these aren't the "self-serving reviews" Google excludes. Only output ratings when count ≥ 1.
- **Guide page:** `LocalBusiness` or `Person` + `Service`.
- **Everywhere:** `BreadcrumbList` (Inicio › Lodges › Aysén › {Name}).
- **Content pages:** `Article`. Add `FAQPage` only if the FAQ is visible on the page.
- Validate with the Rich Results Test before shipping.

### P1. Content architecture to cover "any interest in fly fishing in Chile"

This is what actually captures the long tail. Build hub pages that link down to lodges and guides, and have each lodge link back up.

1. **Region hubs** (from the existing zones; refine the labels to how people search):
   - `/pesca-con-mosca/araucania`
   - `/pesca-con-mosca/los-lagos`, covering Puerto Varas, Llanada Grande and Palena
   - `/pesca-con-mosca/aysen`, covering Coyhaique, Futaleufú and the Carretera Austral
   - `/pesca-con-mosca/magallanes`, covering Tierra del Fuego and Torres del Paine

   Each hub has: intro, rivers, species, season, how to get there, a map of lodges and guides, and the cards.
2. **River pages** for the rivers your lodges actually fish:
   - Bío Bío
   - Futaleufú
   - Palena
   - Yelcho
   - Baker
   - Simpson
   - Mañihuales
   - Grey/Serrano
   - Rasmussen / Tierra del Fuego sea-run browns
3. **Evergreen guides**, high intent and low competition in Spanish:
   - Temporada de pesca en Chile (fechas por región)
   - Licencia de pesca recreativa (Sernapesca): cómo sacarla
   - Especies: trucha marrón, arcoíris, fontinalis, salmón chinook
   - Qué equipo llevar
   - Cómo llegar (Puerto Montt, Balmaceda, Punta Arenas)
   - Lodge vs. guía independiente: qué conviene
   - Costos de un viaje de pesca en Chile
4. **English mirrors** of the top pages, focused on foreign anglers: "Fly fishing in Chile: a complete guide", "Best time to fly fish Patagonia Chile", "Chile vs Argentina for fly fishing".
5. **Lodge pages:** use the rich BSale descriptions, and add structured facts (rivers fished, species, season, capacity, nearest airport) as visible text and in JSON-LD. Put reviews in the HTML, not only in the carousel.
6. **Guides:** populate guides in BSale. There are currently 0, and the section is a dead end for searches like "guía de pesca con mosca Coyhaique".

Write these yourselves or with the lodges. Don't mass-generate them; Google's helpful-content systems target exactly that.

### P2. Performance (Core Web Vitals)

- **Code-split:** lazy-load `AdminApp` and Leaflet (`React.lazy` + `import()`). That should cut the public bundle well under half of the current ~970 KB.
- **Images:** convert to WebP/AVIF with `srcset` and `sizes` (e.g. `vite-imagetools`, or Vercel Image Optimization via `/_vercel/image`). Add explicit `width`/`height`, `loading="lazy"` below the fold, and `fetchpriority="high"` on the hero image or poster.
- **Fonts:** self-host Newsreader and Nunito Sans (`@fontsource`) or at least `preload` them. This removes a render-blocking cross-origin CSS request.

### P2. Off-page and authority

- **onaflyfishing.cl** (the sister site): the header and footer already link out to it. Get a prominent link back, ideally contextual ("Encuentra lodges y guías en ONA Experiences").
- **Listed lodges and guides:** offer a "Verified reviews on ONA" badge that links to their ONA page. These are relevant, natural backlinks.
- **Directories and press:** Sernatur / Chile Travel partner listings, regional tourism sites (InterPatagonia, GoChile), Patagon Journal, Chilean fly fishing clubs and forums.
- **Google Business Profile** for ONA, if there is a real office or service area.
- **Social:** consistent `sameAs` profiles, and share lodge pages, which only gives good previews once OG tags exist.

---

## Suggested rollout

| Phase | Scope | Effort |
|---|---|---|
| 1 | GSC/Bing setup, `robots.txt`, `noindex` admin/review, 308 apex, analytics | ½–1 day |
| 2 | Prerender (RR7 framework mode) + per-page meta + slugs + sitemap + real 404 + JSON-LD | 1–2 weeks |
| 3 | `/en/` locale routing + hreflang + translated description field in admin | ~1 week + translation |
| 4 | Region hubs and the first 5–6 evergreen guides (ES first) | ongoing, 1–2 pages/week |
| 5 | Code-splitting, image pipeline, fonts | 2–3 days |
| 6 | Backlink outreach (lodges, sister site, directories) | ongoing |

**What to watch in GSC:**
- indexed page count reaching all lodges, regions and guides
- impressions for "pesca con mosca" / "fly fishing" + Chile, Patagonia and region terms
- CTR on lodge pages once titles and rich results land

Expect 2–4 months before rankings move meaningfully on a new domain.
