# Resend hosted templates

Source of truth for the variables our app sends when calling Resend dashboard templates.
Design and publish templates in the [Resend Templates dashboard](https://resend.com/dashboard) to match this contract.
The mapper in `templateVariables.ts` must stay aligned with this document.

## Resend constraints

- Variable keys: ASCII letters, numbers, underscores only (`[A-Za-z0-9_]`), max 50 characters
- Reserved names (do **not** use): `FIRST_NAME`, `LAST_NAME`, `EMAIL`, `UNSUBSCRIBE_URL`
- String values: max **2000** characters (the app truncates longer values)
- Templates must be **published** before they can be used for sends
- Use `{{{VAR}}}` in the template body/subject for substitution
- When the send payload includes `from`, `subject`, or `replyTo`, those values override template defaults
- Do not send `html` / `text` / `react` together with `template` (API validation error)

## Setup checklist

1. Create two templates (suggested aliases: `contact-form`, `quote-notification`).
2. Declare every variable listed below on each template.
3. Optionally set default From / Subject on the template; the app still passes `from`, and for quotes a dynamic `subject`.
4. Publish each template.
5. Set env:
   - `RESEND_CONTACT_TEMPLATE_ID=<alias or UUID>`
   - `RESEND_QUOTE_TEMPLATE_ID=<alias or UUID>`
   - `RESEND_REVIEW_INVITE_TEMPLATE_ID=<alias or UUID>`
   - `RESEND_REVIEW_THANKS_TEMPLATE_ID=<alias or UUID>`
   - `RESEND_REVIEW_ADMIN_TEMPLATE_ID=<alias or UUID>`

---

## Contact form — `RESEND_CONTACT_TEMPLATE_ID`

**Purpose:** Notify `ADMIN_EMAIL` when someone submits the website contact form.

**Send payload extras (not template variables):**

| Field | Value |
| --- | --- |
| `from` | `MAIL_FROM` |
| `to` | `ADMIN_EMAIL` |
| `replyTo` | submitter email (`CONTACT_EMAIL`) |
| `subject` | Form `subject` / asunto (built in code) |

### Variables

| Variable | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `CONTACT_NAME` | string | yes | `Ana Pérez` | Form name field |
| `CONTACT_EMAIL` | string | yes | `ana@example.com` | Form email; also used as `replyTo` |
| `CONTACT_SUBJECT` | string | yes | `Consulta lodge` | Form subject field |
| `CONTACT_MESSAGE` | string | yes | `Hola, quiero información.` | Truncated to 2000 characters |

---

## Quote notification — `RESEND_QUOTE_TEMPLATE_ID`

**Purpose:** Notify `ADMIN_EMAIL` when BSale emits a quote document (webhook-driven).

**Published template alias:** `quote-notification` (matches the ONA admin HTML with persona interesada, datos de contacto, información de la experiencia, detalle, Ver cotización / Responder CTAs).

**Send payload extras (not template variables):**

| Field | Value |
| --- | --- |
| `from` | `MAIL_FROM` |
| `to` | `ADMIN_EMAIL` |
| `replyTo` | Customer email when present (`CUSTOMER_EMAIL`) |
| `subject` | Dynamic, e.g. `Nueva cotización #1001 — Estadía lodge` (built in code) |
| `attachments` | Optional files from the quote pipeline |

Resend templates have no loops. Line items are preformatted in code into a single plain-text block (`ITEMS_SUMMARY`).

Declare **exactly** these variable keys on the Resend template (with fallbacks, or the app always sends every key — empty string when unknown).

### Variables

| Variable | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `DOCUMENT_ID` | string | yes | `42` | BSale document id (stringified) |
| `DOCUMENT_NUMBER` | string | no | `1001` | Empty string if missing |
| `SALES_ID` | string | no | `ONA-LODGE-abc` | Empty string if missing |
| `EMISSION_DATE` | string | no | `2024-06-01` | ISO date `YYYY-MM-DD` from Unix timestamp; empty if missing |
| `CUSTOMER_NAME` | string | yes | `Juan Soto` | First + last; falls back to `Cliente` |
| `CUSTOMER_EMAIL` | string | no | `juan@example.com` | Empty string if missing; also used as `replyTo` |
| `CUSTOMER_PHONE` | string | no | `+56911111111` | Empty string if missing |
| `CUSTOMER_CODE` | string | no | `1-9` | RUT / customer code; empty if missing |
| `URL_PUBLIC_VIEW` | string | no | `https://…` | Public quote URL (`Ver cotización`); empty if missing |
| `URL_PDF` | string | no | `https://…` | PDF URL (`Descargar PDF`); empty if missing |
| `ITEMS_SUMMARY` | string | yes | see below | Preformatted plain text of all line items + notes; truncated to 2000 |

### `ITEMS_SUMMARY` format

Plain text, one block for the whole quote. Example:

```text
- Estadía lodge (cantidad: 2)
Detalle:
Cotización para Estadía lodge
 Reserva: 2026-07-01 al 2026-07-04.
 Detalles:grupo de 4
```

Do not include prices, net amounts, taxes, or totals in this block.
If there are no items:

```text
(sin detalle de ítems)
```

---

## Review invite — `RESEND_REVIEW_INVITE_TEMPLATE_ID`

**Purpose:** Email the Customer a one-time link to submit a Review.

| Field | Value |
| --- | --- |
| `from` | `MAIL_FROM` |
| `to` | Customer email |
| `subject` | `Cuéntanos tu experiencia en {PRODUCT_NAME}` |

| Variable | Example |
| --- | --- |
| `CUSTOMER_FIRST_NAME` | `María` |
| `PRODUCT_NAME` | `Bio Bio Lodge` |
| `REVIEW_URL` | `https://ona.example/review?token=…` |
| `EXPIRES_ON` | `2026-10-10` |

---

## Review thank-you — `RESEND_REVIEW_THANKS_TEMPLATE_ID`

**Purpose:** Confirm to the Customer that their Review was received.

| Field | Value |
| --- | --- |
| `from` | `MAIL_FROM` |
| `to` | Customer email |
| `subject` | `Gracias por tu reseña de {PRODUCT_NAME}` |

| Variable | Example |
| --- | --- |
| `CUSTOMER_FIRST_NAME` | `María` |
| `PRODUCT_NAME` | `Bio Bio Lodge` |
| `RATING` | `5` |
| `COMMENT` | `Una estadía excelente…` |

---

## Review admin notification — `RESEND_REVIEW_ADMIN_TEMPLATE_ID`

**Purpose:** Notify `ADMIN_EMAIL` that a Review was submitted (so it can be hidden if needed).

| Field | Value |
| --- | --- |
| `from` | `MAIL_FROM` |
| `to` | `ADMIN_EMAIL` |
| `replyTo` | Customer email |
| `subject` | `Nueva reseña — {PRODUCT_NAME}` |

| Variable | Example |
| --- | --- |
| `CUSTOMER_NAME` | `María González` |
| `CUSTOMER_EMAIL` | `maria@example.com` |
| `PRODUCT_NAME` | `Bio Bio Lodge` |
| `CATALOG_TYPE` | `lodge` |
| `RATING` | `5` |
| `COMMENT` | `Una estadía excelente…` |
| `REVIEW_ID` | UUID |
