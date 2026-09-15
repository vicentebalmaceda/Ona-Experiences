---
status: accepted
---

# Review Invites require a Quote

A Review Invite is issued only from an admin call that supplies a BSale Quote document id (optional admin note). Customer identity and the Product under review are resolved from that Quote—not from a manual customer/product body—so fake or unbound invites cannot be minted without a real cotización. At most one Review may exist per Quote; unused Invites for the same Quote may be re-issued until a Review exists. Manual Customer+Product invites and automatic post-quote invites are out of scope.

## Considered Options

- **Quote-backed Invite (chosen)** — same admin endpoint; body is document id (+ optional note); still email a one-time token; uniqueness keyed by Quote.
- **Keep manual Customer+Product Invite** — easier ops escape hatch, weaker anti-fake story, duplicate identity entry.
- **Submit Review with Quote id, no Invite** — fewer steps, but Quote ids are enumerable and skip one-time token/expiry controls.
- **Automatic Invite on Quote create/webhook** — convenient, but couples sales noise to review spam and was explicitly deferred.

## Consequences

`bsale_document_id` becomes required for new Invites. Product upsert still uses ONA Product UUID (ADR 0002); BSale product id and variant id come from the Quote's single detail line (`GET /documents/{id}/details.json`). Catalog type comes from `GET /products/{id}` mapped through the existing lodge/guide product-type names. Product name prefers the full product fetch, with the detail name as fallback. Upsert does not require the offer to be on the live catalog list; `active` follows BSale product state when known. Existing Invites without a document id remain valid; the rule is forward-only.
