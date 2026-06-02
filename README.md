# ONA Experiences

Monorepo for the ONA Experiences platform: marketing web (React + Tailwind) and catalog API (Express + TypeScript) integrated with [BSale](https://docs.bsale.dev/first-steps).

## Structure

```txt
apps/
  web/          # React + Vite + Tailwind (static demo / marketing)
  api/          # Express API — BSale catalog proxy
docs/           # Architecture and planning
```

## Prerequisites

- Node.js 20+
- BSale sandbox account and API token ([account.bsale.dev](https://account.bsale.dev/users/create))

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set BSALE_ACCESS_TOKEN
cp apps/web/.env.example apps/web/.env
```

## Development

```bash
# Frontend (http://localhost:5173)
npm run dev:web

# API (http://localhost:3001)
npm run dev:api
```

## Build

```bash
npm run build        # web + api
npm run build:web
npm run build:api
```

## API — catalog (lodges & guides)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/lodges` | List lodge services (BSale product type `LODGE`) |
| GET | `/api/v1/guides` | List guide services (BSale product type `GUIDE`) |

### Query parameters (both routes)

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `limit` | int | `25` | 1–50 (BSale max) |
| `offset` | int | `0` | |

### Example

```bash
curl http://localhost:3001/health
curl "http://localhost:3001/api/v1/lodges?limit=10"
curl "http://localhost:3001/api/v1/guides?limit=10&offset=0"
```

### BSale sandbox catalog convention

Create **product types** in BSale named `LODGE` and `GUIDE` (configurable via env). Under each type, create **service** products (`classification: 1`, one variant each):

| Route | BSale product type name (env) | Example product |
|-------|-------------------------------|-----------------|
| `/lodges` | `BSALE_LODGE_PRODUCT_TYPE_NAME=LODGE` | Bio Bío Lodge — Estadía |
| `/guides` | `BSALE_GUIDE_PRODUCT_TYPE_NAME=GUIDE` | Guía — Juan Pérez |

Flow per request: resolve product type → list products under that type → fetch each product’s variant.

### Lodge response shape

Each item matches the lodge model in [`apps/web/src/data.js`](apps/web/src/data.js). BSale provides `productId` and `name`; marketing fields are `null` until merged on the client from seed data by `productId`.

```json
{
  "items": [
    {
      "productId": 65561,
      "name": "Lodge_San_Francisco",
      "zone": null,
      "phone": null,
      "email": null,
      "representative": null,
      "lat": null,
      "lng": null,
      "image": null,
      "gallery": null,
      "rating": null,
      "reviews": null,
      "ratingLabel": null
    }
  ],
  "pagination": { "limit": 10, "offset": 0, "count": 1 }
}
```

### Guide response shape

Each item matches the guide model in [`apps/web/src/data.js`](apps/web/src/data.js) (no `representative` field):

```json
{
  "items": [
    {
      "productId": 12345,
      "name": "Guia_Juan_Perez",
      "zone": null,
      "phone": null,
      "email": null,
      "lat": null,
      "lng": null,
      "image": null,
      "gallery": null,
      "rating": null,
      "reviews": null,
      "ratingLabel": null
    }
  ],
  "pagination": { "limit": 10, "offset": 0, "count": 1 }
}
```

### Frontend

Set `VITE_API_URL` in `apps/web/.env` (see `apps/web/.env.example`). The web app fetches lodges and guides from the API only (no static fallback lists). Seed rows in `apps/web/src/data.js` fill **null** fields when `productId` matches; API values are never overwritten. Add `productId` to seed rows as you link products in BSale.

### Logging

The API logs every incoming request and response (method, path, status, duration). Set `LOG_LEVEL` in `apps/api/.env`:

| Level | What you see |
|-------|----------------|
| `debug` | HTTP traffic + BSale outbound calls + catalog flow (default in development) |
| `info` | HTTP traffic + catalog summaries |
| `warn` | Client/BSale errors |
| `error` | Failures only |

Use `createLogger('your-context')` from `apps/api/src/shared/logger.ts` for custom debug logs in new code.

### Pagination note

`limit` and `offset` paginate products under the resolved BSale product type (`GET /product_types/{id}/products.json`). Each product on the page loads one variant. `pagination.count` is BSale’s total product count for that type. You may receive fewer than `limit` items if some products are not services or lack a variant.

## Environment variables

See [apps/api/.env.example](apps/api/.env.example). Required:

- `BSALE_ACCESS_TOKEN` — BSale API token (never commit)

## Related docs

- [docs/bsale-centric-architecture.md](docs/bsale-centric-architecture.md)
- [.cursor/skills/bsale-api/SKILL.md](.cursor/skills/bsale-api/SKILL.md)

## Web app (apps/web)

Lodges and guides load from `GET /api/v1/lodges` and `GET /api/v1/guides`. Map markers skip items without `lat`/`lng`.
