# BSale API — Reference (Chile CL)

Source: [docs.bsale.dev](https://docs.bsale.dev/first-steps) (API Chile). Country variants: CL, PE, MX — this project uses **CL**.

## Conventions

- **SSL** required for production webhooks and recommended for all calls.
- Resource URLs: plural nouns — `/clients.json`, `/clients/{id}.json`.
- Responses: JSON, camelCase attributes, English attribute names.
- **Dates:** Unix integer seconds. For `emissionDate` / `expirationDate`, use date-only semantics (do not apply timezone offsets to the calendar date).
- **List queries:** `limit` (default 25, max 50), `offset`, `fields`, `expand`.

## Authentication

```http
GET https://api.bsale.io/v1/clients.json
access_token: <your_token>
Content-Type: application/json
```

| Environment | How to get token |
|-------------|------------------|
| Sandbox | [account.bsale.dev/users/create](https://account.bsale.dev/users/create) |
| Production (direct) | Email [ayuda@bsale.app](mailto:ayuda@bsale.app) |
| Production (SaaS) | [OAuth 2.0](https://docs.bsale.dev/oauth) — redirect to `https://oauth.bsale.io/login`, then `POST https://oauth.bsale.io/gateway/oauth_response.json` |

OAuth token response shape: `{ "code": 200, "data": { "accessToken", "clientName", "clientCode" } }`.

## Clients (`/v1/clients`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/clients.json` | List (filters: `code`, `email`, `firstname`, `lastname`, `state`) |
| GET | `/clients/{id}.json` | One client |
| GET | `/clients/count.json` | Count |
| POST | `/clients.json` | Create |
| PUT | `/clients/{id}.json` | Update |
| DELETE | `/clients/{id}.json` | Virtual delete (`state` → 99) |

**Key fields:** `id`, `firstName`, `lastName`, `code` (RUT), `email`, `phone`, `company`, `address`, `city`, `municipality`, `activity`, `companyOrPerson` (0=person, 1=company), `state` (0=active, 1=inactive), `isForeigner`.

**Nested:**
- `/clients/{id}/contacts.json` — POST contacts
- `/clients/{id}/addresses.json` — billing/shipping addresses

**Create example:**

```json
{
  "firstName": "Armando",
  "lastName": "Paredes",
  "email": "armando@paredes.cl",
  "phone": "66287196",
  "code": "98765432-1",
  "address": "Los trigales 372",
  "city": "Santiago",
  "municipality": "Las Condes",
  "activity": "Venta de ropa",
  "company": "Particular"
}
```

**Lookup by RUT:** `GET /v1/clients.json?code=12345678-9`

## Documents (`/v1/documents`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/documents.json` | List (filters: `clientid`, `documenttypeid`, `officeid`, `number`, `emissiondate`, …) |
| GET | `/documents/{id}.json` | One document |
| GET | `/documents/count.json` | Count |
| POST | `/documents.json` | Create sale document |
| DELETE | `/documents/{id}.json?officeId={id}` | Delete non-electronic only |

**Response highlights:** `id`, `number`, `totalAmount`, `netAmount`, `taxAmount`, `urlPdf`, `urlPublicView`, `urlXml`, `token`, `informedSii`, `document_type`, `client`, `office`.

### POST document — required root fields

| Field | Type | Notes |
|-------|------|-------|
| `documentTypeId` | int/string | Or use `codeSii` instead |
| `officeId` | int/string | Branch issuing the document |
| `emissionDate` | int | Unix |
| `expirationDate` | int | Unix |
| `declareSii` | 0/1 | 1 = declare to SII |
| `priceListId` | int | Optional; branch default if omitted |

### Client on document

Either:

```json
{ "clientId": 24 }
```

or inline (creates/associates at emit time):

```json
{
  "client": {
    "code": "98765432-1",
    "firstName": "…",
    "lastName": "…",
    "email": "…",
    "address": "…",
    "city": "…",
    "municipality": "…",
    "activity": "…",
    "companyOrPerson": 0
  }
}
```

Optional: `addressId`, `sendEmail: 1` (root level, sends DTE to client email).

### Line items (`details`)

**Service / no inventory (typical for ONA reservations):**

```json
{
  "details": [{
    "comment": "Reserva lodge …",
    "netUnitValue": 10916,
    "quantity": 1,
    "taxes": [{ "code": 14, "percentage": 19 }]
  }]
}
```

**With product catalog:**

```json
{
  "details": [{
    "variantId": 1,
    "netUnitValue": 23438,
    "quantity": 1,
    "taxId": "[1]",
    "comment": "Product name",
    "discount": 0
  }]
}
```

| Detail field | Notes |
|--------------|-------|
| `netUnitValue` | Unit net price (no tax); must be ≥ 0 |
| `quantity` | Integer |
| `taxId` | String like `"[1,2]"` — BSale tax ids |
| `taxes` | `[{ "code": 14, "percentage": 19 }]` — SII tax codes |
| `comment` | Line description when no `variantId` |
| `variantId` / `code` / `barCode` | Product reference |

### Payments (optional)

```json
{
  "payments": [{
    "paymentTypeId": 1,
    "amount": 27891,
    "recordDate": 1407715200
  }]
}
```

If omitted, BSale assigns default payment type for full amount.

### References (optional)

Link OC, guides, etc.:

```json
{
  "references": [{
    "number": "123",
    "referenceDate": 1407715200,
    "reason": "Orden de Compra 123",
    "codeSii": 801
  }]
}
```

### Idempotency

```json
{ "salesId": "ONA-TXN-uuid-here" }
```

Duplicate POST with same `salesId` + document type returns existing document instead of creating a new one.

### Other document flags

| Field | Purpose |
|-------|---------|
| `sellerId` | Assign seller user |
| `dispatch` | 1 = dispatch and reduce stock (requires `variantId`, not `comment`-only lines) |
| `dynamicAttributes` | Custom fields configured in BSale |
| `commissionRate` / `commissionCodeSii` | Invoice settlement |
| `coinId`, `exchangeRate`, … | Export invoices |

### Credit notes

Not created via standard sale POST. Use **devoluciones** API: [docs.bsale.dev — devoluciones](https://docs.bsale.dev/CL/devoluciones).

## Webhooks

BSale POSTs JSON to your HTTPS URL:

| Field | Meaning |
|-------|---------|
| `cpnId` | Company instance id |
| `resource` | API URL to fetch resource |
| `resourceId` | Resource id |
| `topic` | e.g. Document, Stock, Product |
| `action` | `POST`, `PUT`, `DELETE` |
| `send` | Unix timestamp |

Topics include: Document, Stock, Product, Variant, Price, Payments, etc. Request activation at [ayuda@bsale.app](mailto:ayuda@bsale.app) with callback URL and company RUT/cpnId.

## Product types (`/v1/product_types`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/product_types.json` | List (filters: `name`, `state`, `limit`, `offset`) |
| GET | `/product_types/{id}.json` | One product type |
| GET | `/product_types/{id}/products.json` | Products under a type |
| GET | `/product_types/count.json` | Count |

**ONA catalog flow:** resolve type by name (`name=LODGE`), list products under type, then `GET /products/{id}/variants.json` for the bookable variant.

## Related resources (configuration)

Consult BSale docs menu for:

- **Document types** — `/document_types.json`
- **Offices** — `/offices.json`
- **Products / variants** — if itemizing lodge vs guide fees
- **Payment types** — `/payment_types.json`
- **Price lists** — `/price_lists.json`

## Minimal end-to-end curl

```bash
# 1. Create client
curl -X POST 'https://api.bsale.io/v1/clients.json' \
  -H "access_token: $BSALE_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Test","lastName":"User","code":"11111111-1","email":"t@example.com"}'

# 2. Create document
curl -X POST 'https://api.bsale.io/v1/documents.json' \
  -H "access_token: $BSALE_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "documentTypeId": "1",
    "officeId": "1",
    "emissionDate": '"$(date +%s)"',
    "expirationDate": '"$(date +%s)"',
    "declareSii": 1,
    "clientId": 1,
    "salesId": "ona-test-001",
    "details": [{
      "comment": "ONA test reservation",
      "netUnitValue": 10000,
      "quantity": 1,
      "taxes": [{"code": 14, "percentage": 19}]
    }]
  }'
```

Replace IDs with values from your BSale sandbox.
