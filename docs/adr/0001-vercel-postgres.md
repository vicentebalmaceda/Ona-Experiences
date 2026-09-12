---
status: accepted
---

# Vercel Postgres for ONA-owned data

Reviews and the local Product catalog need a real relational store; this app only had BSale plus optional KV cache. We will use Vercel Postgres (Neon) because the BFF already runs on Vercel serverless, and we do not need a second platform for auth in v1.

## Considered Options

- **Vercel Postgres** — same dashboard and a serverless driver; invite tokens are our own table, not a hosted auth product.
- **Supabase** — Postgres plus magic-link auth, but another vendor and more surface than a one-shot Review Invite needs.
- **Turso** — lighter, weaker fit for the Postgres ecosystem we will want when Products grow.
- **KV only** — cannot query Visible Review aggregates or enforce invite uniqueness cleanly.

## Consequences

KV stays cache-only (catalog, quote-notification idempotency). Customer login is not introduced with this database.
