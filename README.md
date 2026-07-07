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
| GET | `/api/v1/lodges/:productId` | Get a single lodge by BSale product id |
| GET | `/api/v1/guides` | List guide services (BSale product type `GUIDE`) |
| GET | `/api/v1/guides/:productId` | Get a single guide by BSale product id |

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
curl "http://localhost:3001/api/v1/lodges/65561"
curl "http://localhost:3001/api/v1/guides/65562"
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

### Detail response shape

`GET /api/v1/lodges/:productId` and `GET /api/v1/guides/:productId` return a single object (same fields as one list item). Returns `404` when the product does not exist, is not a service, or does not belong to the expected BSale product type.

### Frontend

Set `VITE_API_URL` in `apps/web/.env` (see `apps/web/.env.example`). The web app fetches lodges and guides from the API only (no static fallback lists). Seed rows in `apps/web/src/data.js` fill **null** fields when `productId` matches; API values are never overwritten. Add `productId` to seed rows as you link products in BSale.

**Routes:**

| Path | Page |
|------|------|
| `/` | Landing (lodges & guides directory) |
| `/lodges/:productId` | Lodge detail |
| `/guides/:productId` | Guide detail |

Cards and map popups link to the detail routes. Detail pages call the single-item API endpoints and merge seed data the same way as the landing list.

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

## API — sales (cotización)

Creates a BSale **cotización** (pre-sale quote, `declareSii: 0`) for a lodge or guide service. The API upserts the customer in BSale **by email**, validates the product belongs to the expected product type, resolves pricing from the configured price list, and posts `POST /v1/documents.json`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/lodges/:productId/sales` | Create cotización for a lodge service |
| POST | `/api/v1/guides/:productId/sales` | Create cotización for a guide service |

`productId` is the BSale product id (same as catalog detail routes). Returns `404` with `LODGE_NOT_FOUND` / `GUIDE_NOT_FOUND` when the product is missing or wrong type.

### Request body

```json
{
  "quantity": 1,
  "customer": {
    "email": "juan@example.com",
    "firstName": "Juan",
    "lastName": "Pérez"
  },
  "reservationDate": "2026-07-15",
  "reservationEndDate": "2026-07-18",
  "notes": "Estadía de 3 noches, grupo de 4 personas.",
  "emissionDate": "2026-06-02",
  "expirationDate": "2026-06-09"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `customer.email` | Yes | Primary key; BSale client lookup/upsert via `GET /clients.json?email=` |
| `customer.firstName`, `lastName` | Yes | |
| `reservationDate` | Yes | ISO date `YYYY-MM-DD` (start); included in cotización line comment |
| `reservationEndDate` | Yes | ISO date `YYYY-MM-DD` (end); must be on or after `reservationDate` |
| `notes` | Yes | Explanation of the request (min 10 chars); appended to line comment |
| `quantity` | No (default `1`) | Integer ≥ 1 |
| `emissionDate`, `expirationDate` | No | Document dates; defaults to today / +7 days |

Line comment format: `{productName} — Reserva: {reservationDate} al {reservationEndDate}. {notes}`

### Response (201)

```json
{
  "salesId": "ONA-LODGE-550e8400-e29b-41d4-a716-446655440000",
  "serviceType": "lodge",
  "productId": 65561,
  "variantId": 1082816,
  "productName": "Lodge_San_Francisco",
  "bsaleClientId": 24,
  "bsaleDocumentId": 8135,
  "documentNumber": 732,
  "totalAmount": 119000,
  "netAmount": 100000,
  "taxAmount": 19000,
  "urlPdf": "https://...",
  "urlPublicView": "https://..."
}
```

### Example

Resolve cotización config from your BSale sandbox once:

```bash
curl -H "access_token: $BSALE_ACCESS_TOKEN" "https://api.bsale.io/v1/document_types.json"
curl -H "access_token: $BSALE_ACCESS_TOKEN" "https://api.bsale.io/v1/offices.json"
curl -H "access_token: $BSALE_ACCESS_TOKEN" "https://api.bsale.io/v1/price_lists.json"
```

Create a lodge cotización:

```bash
curl -X POST http://localhost:3001/api/v1/lodges/65561/sales \
  -H "Content-Type: application/json" \
  -d '{"customer":{"email":"test@example.com","firstName":"Test","lastName":"User"},"reservationDate":"2026-07-01","reservationEndDate":"2026-07-04","notes":"Estadía de 3 noches, grupo de 4 personas."}'

curl -X POST http://localhost:3001/api/v1/guides/<guideProductId>/sales \
  -H "Content-Type: application/json" \
  -d '{"customer":{"email":"test@example.com","firstName":"Test","lastName":"User"},"reservationDate":"2026-07-01","reservationEndDate":"2026-07-01","notes":"Guía full day para grupo de 2 personas."}'
```

### Frontend quote request

Lodge and guide detail pages (`/lodges/:productId`, `/guides/:productId`) include a **Solicitar cotización** form ([`QuoteRequestForm`](apps/web/src/components/QuoteRequestForm.jsx)) that:

- Collects name, email, reservation start/end dates (calendar pickers), and reservation details
- Persists `{ email, firstName, lastName }` in `localStorage` under `ona-user-profile` (email as primary key)
- Posts to `POST /api/v1/lodges/:productId/sales` or `POST /api/v1/guides/:productId/sales`
- Shows success with `salesId`, document number, total, and PDF/public links when BSale returns them

## Environment variables

See [apps/api/.env.example](apps/api/.env.example). Required:

- `BSALE_ACCESS_TOKEN` — BSale API token (never commit)
- `BSALE_OFFICE_ID` — Branch id for cotización documents
- `BSALE_QUOTE_DOCUMENT_TYPE_ID` — Cotización document type id from BSale admin
- `BSALE_PRICE_LIST_ID` — Price list used for `netUnitValue` on sale lines

## Related docs

- [docs/bsale-centric-architecture.md](docs/bsale-centric-architecture.md)
- [.cursor/skills/bsale-api/SKILL.md](.cursor/skills/bsale-api/SKILL.md)

## Web app (apps/web)

Lodges and guides load from `GET /api/v1/lodges` and `GET /api/v1/guides`. Detail pages load from `GET /api/v1/lodges/:productId` and `GET /api/v1/guides/:productId`. Detail pages include a quote request form that posts to the sales endpoints. Map markers skip items without `lat`/`lng`.
