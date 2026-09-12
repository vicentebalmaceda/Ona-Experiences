---
status: accepted
---

# Reviews attach to an ONA Product, not a BSale id

BSale owns the live sellable catalog; ONA will later persist lodges and guides locally to cut live wiring. A Review must survive that cutover, so it references an ONA Product UUID. BSale `productId` plus catalog type (lodge or guide) are only the unique external key used to upsert the Product.

## Considered Options

- **ONA UUID, BSale ids as sync key** — Reviews and Review Invites FK the UUID; public URLs and catalog joins still use type + BSale `productId` until the site reads Postgres.
- **BSale `productId` + type as the primary key** — simpler now, rewrites every Review if a BSale product is replaced or we stop treating ERP ids as ours.
- **Attach Reviews to a Variant** — public pages are per Product; BSale SKUs change and would orphan comments.

## Consequences

This slice upserts a thin Product (id, type, BSale product id, name, active flag) when an admin sends a Review Invite. Catalog webhooks stay cache-only. A Variant table and full presentation sync are a later project; an invite may only remember an optional BSale variant id. If BSale drops an offer, the Product is marked inactive and its Reviews remain.
