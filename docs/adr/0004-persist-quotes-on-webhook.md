---
status: accepted
---

# Persist invite-ready Quotes on the Quote webhook

ONA keeps a durable Quote row keyed by BSale document id so Review Invite create can resolve Customer and Product without calling BSale when the webhook already captured an invite-ready cotización. The webhook is the only writer: after fetching document, details, client, and product (same stack as invite resolution), it upserts Product, upserts the Quote (embedded Customer, Product FK, variant id), then sends the admin email. Persist runs before email; DB failure returns 5xx so BSale retries. Incomplete Quotes (multi-line, missing product/variant/email) are not stored; email may still send. Invite create reads the local Quote first and falls back to live BSale if missing.

## Considered Options

- **Webhook-only invite-fuel Quote (chosen)** — minimal columns; no Customer table; no amounts/PDF ledger.
- **Also write on ONA create-quote** — earlier local row, two writers, more sync edge cases.
- **Partial Quote rows for every document id** — easier “find by id,” but invite-ready semantics blur.
- **Postgres-only invite with no BSale fallback** — cleaner long-term, breaks invites for Quotes that never got a complete webhook.

## Consequences

`quotes` is upserted on `bsale_document_id`. Review Invite resolution prefers that row. Catalog/Product upsert moves earlier for webhook-captured Quotes. Automatic Review Invites remain out of scope (ADR 0003).
