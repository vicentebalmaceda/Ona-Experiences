---
status: accepted
date: 2026-10-20
---

# Admin-editable configuration lives in a `site_settings` table, one JSON value per code-declared key

Recipients of the internal emails (contact form, new cotización, new review) used to be a single env var, `ADMIN_EMAIL`, so any change needed a redeploy. They are now editable from `/admin` → Configuración → Correos, with a `to` and a `cc` list per flow and a "Enviar prueba" button.

## Decision

- One generic table: `site_settings (key, value jsonb, updated_by, updated_at)`. Keys are declared in `apps/web/shared/siteSettings.ts` with a label, a description and a validator; admins never create keys. Today: `mail.contact`, `mail.quote`, `mail.review_admin`, each `{ to: string[], cc: string[] }`. The next setting (invite validity, etc.) is a new key and a card, not a new table.
- A missing or malformed row, or a failing read (table not migrated), falls back to `ADMIN_EMAIL` with no cc, so email never stops. Values are cached 60 s and the cache entry is cleared on save/reset.
- The mailer takes a `MailRecipientResolver`; it no longer reads `ADMIN_EMAIL` directly. Customer-facing emails (review invite, thank-you) are untouched.
- Test sends use the flow's real Resend template with sample data and a "[Prueba]" subject, to the addresses in the request (saved or not), throttled to one per flow per minute.
- Stays in env on purpose: `MAIL_FROM` (Resend only sends from the verified domain) and `ADMIN_EMAILS` (an admin session must not be able to grant logins).

## Function budget

All routes (`GET /admin/settings`, `PUT|DELETE /admin/settings/:key`, `POST /admin/settings/:key/test`) are entries in the `/api/v1` router. The deployment still has three Vercel functions (`api/v1/index.ts`, `api/health.ts`, `api/webhooks/bsale.ts`); Hobby allows twelve. New features must add routes, not functions.

## Consequences

- One SQL block to run on Neon (`site_settings` in `schema.sql`); deploy order does not matter.
- Reads happen on the webhook path (one cached query per quote); negligible.
