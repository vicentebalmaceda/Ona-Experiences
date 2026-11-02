---
status: accepted
date: 2026-11-02
---

# English product descriptions are machine-translated on the server and stored in `product_translations`

BSale descriptions (descripción web) are Spanish only, so `/en/lodges/:slug` and `/en/guides/:slug` showed English chrome around Spanish text and were kept `noindex` (open decision in `docs/proposals/seo-implementation-plan.md`, option (b)).

## Decision

- Descriptions are translated with the Google Cloud Translation API (Basic, v2, HTML mode) on the server, never in the browser: a client-side widget rewrites the DOM after load, so crawlers never see the English text, and it breaks hydration.
- Translations are stored in Postgres, `product_translations (catalog_type, bsale_product_id, lang, source_hash, description_html, translated_at)`, keyed by BSale's product id like the catalog. `source_hash` is the SHA-256 of the Spanish HTML: a product is translated once and again only after its BSale description changes.
- `DescriptionTranslationService.localize` makes a missing or stale translation on demand. The detail endpoint takes `?lang=` and returns `description` in that language when a translation exists, plus `descriptionLang` and `descriptionLangs`. The prerender asks for every product in every language, so each deploy fills all translations.
- If Google fails or `GOOGLE_TRANSLATE_API_KEY` is unset, the Spanish source is served (never a stale translation) and the page behaves as before.
- SEO: an English detail page is indexed, self-canonical and paired with the Spanish one through hreflang (es, en, x-default → es) only when its description is in English. The sitemap follows the heads. Without a translation it stays `noindex` and unpaired.
- The page says "Automatically translated from Spanish." under the description, and the description carries its own `lang` attribute.
- No admin review or editing of translations for now. A manual override would be another row source for the same table.

## Consequences

- One SQL block to run on Neon (`product_translations` in `schema.sql`) before deploying.
- `GOOGLE_TRANSLATE_API_KEY` (restricted to the Cloud Translation API) in the Vercel project, Production and Preview. Cost is cents: only changed descriptions are sent, compacted to what the sanitizer keeps.
- The first build after this ships translates every product (a few seconds per product, 4 at a time).
