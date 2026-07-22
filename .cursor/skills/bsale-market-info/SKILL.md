---
name: bsale-market-info
description: >-
  Integrates BSale Chile "Descripción web" / market_info ecommerce product APIs
  (HTML descriptions, images, collections). Use when enriching ONA lodge/guide
  catalog presentation from BSale web products, market_info, urlImg, pictures,
  urlSlug, or tienda en línea. Production environment only.
---

# BSale Descripción web (market_info)

Official docs: [Descripción web](https://docs.bsale.dev/descripcion-web)

Companion skill for ERP catalog/fiscal work: [bsale-api](../bsale-api/SKILL.md).

## Critical constraint — production only

This API surface belongs to BSale **tienda en línea** (ecommerce).

- Use a **production** `access_token` and production merchant data.
- Do **not** expect sandbox/dev tokens to return usable market_info.
- In local/dev without prod access: skip market enrichment and rely on seed/`data.js`.
- Never hard-fail catalog list/detail solely because market_info is unavailable.

## What this is (vs ERP products)

| Layer | Endpoints | ONA use |
|-------|-----------|---------|
| ERP catalog | `/v1/products`, `/v1/product_types/.../products`, variants | Membership (LODGE/GUIDE), sales `variantId`, variant SKU `code` |
| Web / market | `/v2/products/.../market_info` | Presentation: HTML copy, images, slug |

**ONA join:** variant SKU `code` → `market_info?code={sku}`.  
Also remember: web id `id` / `productWfId` ≠ ERP `productId`.

## Auth and URL versioning

- Header: `access_token: <token>` (same as other BSale calls).
- Paths are mixed **v1 / v2 / v3**. ONA `BsaleClient` defaults to `https://api.bsale.io/v1` — call v2/v3 with a version-aware base or absolute path.
- List responses use `data` (not v1 `items`): `{ code, href, count, limit, offset, data: [...] }`.

## Read endpoints (ONA-relevant)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v2/products/list/market_info.json` | ONA primary filter: `code={variant.sku}` |
| GET | `/v2/products/market_info/:webId.json` | One web product by **web** id |
| GET | `/v2/products/market_info/:webId/pictures.json` | Gallery URLs |

### Filters — do not mix up ids

| Param | Filters by |
|-------|------------|
| `code` | Variant SKU — **ONA enrichment path** |
| `productWfId` | Web description `id` |
| `prodArray` | Array of web description `id`s — **not** ERP `productId` |
| `productId` | ERP product id (on `/markets/:id/.../market_info` only) |

Useful expanders: `descriptions`, `images`, `baseInfo`, `variantsInfo`, `collections`, `brand`.

ONA enrichment example:

```http
GET https://api.bsale.io/v2/products/list/market_info.json?code=1558978818371&expand=[images,descriptions]&limit=1
access_token: <PRODUCTION_TOKEN>
```

## Fields to map into ONA

| market_info | ONA target | Notes |
|-------------|------------|-------|
| lookup key | variant `code` (SKU) | From ERP `/products/{id}/variants.json` |
| `name` | display name override | Prefer when non-empty |
| `description` | `description` | HTML string or null (main reseña) |
| `urlImg` | `presentation.image` | Default variant image |
| `pictures[].href` | `presentation.gallery` | Only when non-empty array |
| `descriptions[]` (`Lat`) | `presentation.lat` | From `expand=[images,descriptions]`; strip HTML → number |
| `descriptions[]` (`Lng`) | `presentation.lng` | Same |
| `descriptions[]` (`Zone`) | `presentation.zone` | Strip HTML → string |
| `descriptions[]` (`Phone`) | `presentation.phone` | Strip HTML → string |
| `descriptions[]` (`Email`) | `presentation.email` | Prefer `mailto:` href, else stripped text |
| `id` | web product id | For pictures/detail follow-ups only |

**Not provided by market_info descriptions:** `representative`, `rating`, `reviews`, `ratingLabel` — keep seed enrichment for those. Missing description blocks leave the matching presentation field null until seed fills gaps.

## ONA implementation pattern

1. Keep `BsaleCatalogRepository` on ERP product types + variants (first active variant → `code`).
2. `getByCodes`: for each SKU, `GET market_info.json?code={sku}&expand=[images,descriptions]`; soft-fail per SKU; cache per code.
3. `MarketInfoEnricher` then `SeedServiceEnricher` (BSale wins; seed fills gaps).
4. Merge rule: fill from market_info when present; gallery only if pictures is a non-empty array; map `descriptions` by case-insensitive `descriptionName`.

## Gotchas

- Never pass ERP `productId`s to `prodArray`.
- Empty `description` or missing web product is normal if the SKU was never published online — fall back to seed.
- Client concurrency limiter already caps parallel SKU fetches on list pages.
