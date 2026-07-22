---
name: bsale-api
description: >-
  Integrates with BSale Chile REST API (api.bsale.io): clients, fiscal documents,
  webhooks, OAuth. Use when syncing customers, creating boletas/facturas, credit
  notes, besale_sync_events, transactions, or ERP integration for ONA Experiences.
---

# BSale API (Chile)

Official docs: [Introducción](https://docs.bsale.dev/first-steps) · [Primeros pasos](https://docs.bsale.dev/get-started) · [Clientes](https://docs.bsale.dev/clientes) · [Documentos](https://docs.bsale.dev/documentos) · [Webhooks](https://docs.bsale.dev/webhooks) · [OAuth](https://docs.bsale.dev/oauth)

For endpoint tables and JSON examples, read [reference.md](reference.md). For ONA Experiences field mapping, read [ona-mapping.md](ona-mapping.md). For ecommerce descripción web / market_info (production only), read [bsale-market-info](../bsale-market-info/SKILL.md).

## Quick reference

| Item | Value |
|------|--------|
| Base URL | `https://api.bsale.io/v1/` |
| Auth header | `access_token: <token>` on every request |
| Content-Type | `application/json` for POST/PUT |
| Dates | Unix integers (seconds); emission/expiration = date only, no timezone shift |
| JSON keys | camelCase; list responses use `items`, `count`, `limit`, `offset` |
| Pagination | `limit` (max 50), `offset` (default 0) |
| Expand relations | `?expand=[client,office,details]` |

## Authentication

**Sandbox:** Create account and token at [account.bsale.dev](https://account.bsale.dev/users/create).

**Production (single tenant):** Request token from [ayuda@bsale.app](mailto:ayuda@bsale.app) or use OAuth 2.0 for multi-tenant apps ([OAuth guide](https://docs.bsale.dev/oauth)).

```bash
curl -H "access_token: $BSALE_ACCESS_TOKEN" \
  "https://api.bsale.io/v1/clients.json?limit=1"
```

Never commit tokens. Use env vars: `BSALE_ACCESS_TOKEN`, `BSALE_OFFICE_ID`, `BSALE_DOCUMENT_TYPE_ID`, `BSALE_PRICE_LIST_ID`, `BSALE_PAYMENT_TYPE_ID`.

## HTTP methods

| Method | Use |
|--------|-----|
| GET | Read resources |
| POST | Create |
| PUT | Update |
| DELETE | Soft-delete (state change), not hard delete |

## Core workflows

### 1. Upsert client (customer)

1. If ONA has `besale_customer_id` → `PUT /v1/clients/{id}.json`.
2. Else lookup by RUT: `GET /v1/clients.json?code={rut}`.
3. Else `POST /v1/clients.json` with `firstName`, `lastName`, `email`, `phone`, `code` (RUT), `address`, `city`, `municipality`.
4. Store returned `id` as `besale_customer_id`; log to `besale_sync_events`.

**RUT** goes in `code`. Validate format before send. Foreigners: `isForeigner: 1` (see [clientes — extranjero](https://docs.bsale.dev/clientes#cliente-extranjero)).

### 2. Create sales document (invoice / boleta)

Triggered when ONA reservation is `paid` and `transactions` row exists.

1. Ensure client synced (`clientId` preferred over inline `client`).
2. `POST /v1/documents.json` with required config IDs from BSale admin:
   - `documentTypeId` or `codeSii` (e.g. 39 = boleta electrónica)
   - `officeId`
   - `emissionDate`, `expirationDate` (Unix)
   - `declareSii`: `1` to declare to SII
3. **Line items** (`details`): send `taxes` or `taxId` on every line or line is exempt.
   - With catalog: `variantId` + `netUnitValue` + `quantity`
   - Without catalog (services): `comment` + `netUnitValue` + `quantity` + taxes
4. Optional: `payments`, `references`, `salesId` (idempotency — duplicate POST returns existing doc).
5. Store response `id` → `besale_document_id`; `urlPdf` / `urlPublicView` for customer; snapshot in `besale_payload`.

Minimal boleta example (from [first-steps](https://docs.bsale.dev/first-steps)):

```json
{
  "documentTypeId": "1",
  "officeId": "1",
  "emissionDate": 1462527931,
  "clientId": 24,
  "details": [{
    "netUnitValue": 10916,
    "quantity": 1,
    "taxes": [{ "code": 14, "percentage": 19 }],
    "comment": "Reserva ONA #{reservationId}"
  }]
}
```

### 3. Credit note / refund

Use BSale **devoluciones** flow, not a normal sale document. See [documentos — notas de crédito](https://docs.bsale.dev/documentos) and [devoluciones](https://docs.bsale.dev/CL/devoluciones). Reference original document in `references`.

### 4. Idempotency and retries

- Set `salesId` to ONA `transaction.id` (or reservation id) to avoid duplicate fiscal docs.
- Before retry: `GET /v1/documents.json?salesId=...` or check local `besale_document_id`.
- Log every attempt in `besale_sync_events`; redact `access_token` from payloads.

### 5. Webhooks (optional inbound)

BSale POSTs to your URL on document/product/stock events. Payload includes `resource`, `resourceId`, `topic`, `action`, `cpnId`. Fetch full object via API using `resource` URL. Activation: email [ayuda@bsale.app](mailto:ayuda@bsale.app) with URL and company RUT/cpnId. See [webhooks](https://docs.bsale.dev/webhooks).

## Configuration prerequisites

Before first document in a new BSale account, resolve and cache:

| Config | Endpoint hint |
|--------|----------------|
| Offices | `/v1/offices.json` |
| Document types | `/v1/document_types.json` |
| Price lists | `/v1/price_lists.json` |
| Payment types | `/v1/payment_types.json` |
| Tax codes | Use `taxes` with SII `code` (e.g. 14 = IVA 19%) |

## Chile / SII notes

- `declareSii: 1` submits electronic docs to SII.
- `informedSii` on response: `0` ok, `1` sent, `2` rejected.
- `netUnitValue` must not be negative.
- Factura requires client; boleta may omit client but can include one.

## ONA Experiences

This project treats BSale as **system of record for fiscal documents**. Operational data stays in PostgreSQL.

| ONA doc | Section |
|---------|---------|
| Sync triggers, tables | `docs/database-model.md` §7 |
| Week 4 tasks | `docs/development-plan.md` |
| Field mapping | [ona-mapping.md](ona-mapping.md) |

Admin retry endpoint (planned): `POST /transactions/:id/sync-besale`.

## When implementing

1. Read [ona-mapping.md](ona-mapping.md) for column ↔ API field mapping.
2. Read [reference.md](reference.md) for endpoints and parameters.
3. Prefer `clientId` + pre-synced customer over inline `client` on documents.
4. Always attach taxes on `details` lines.
5. Use Unix timestamps via UTC date boundaries for `emissionDate` / `expirationDate`.

## Errors and help

- FAQ and error codes: linked from [first-steps](https://docs.bsale.dev/first-steps)
- Slack: [BSale developers](https://join.slack.com/t/bsaledev/shared_invite/zt-30lqq3jd2-8fMuWb0sDGBA87vsMuTqSg)
- Support: [ayuda@bsale.app](mailto:ayuda@bsale.app)
