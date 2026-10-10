---
status: accepted
date: 2026-10-10
---

# Admin-managed site assets live in Vercel Blob, pointed at from Postgres

The landing hero (image or looping video) and the logo are replaceable from `/admin` → "Sitio" without a deploy. Files go straight from the admin's browser to a **public Vercel Blob store** (client uploads with a session-gated token), and a `site_assets` row per Asset Slot records what is published. The public site reads `GET /api/v1/site/assets` (CDN-cached 60 s) and falls back to the bundled defaults in `public/assets` whenever the endpoint, the table or a blob is unavailable.

Full rationale and alternatives (Cloudinary, S3, Git commits, Postgres bytea): [docs/proposals/admin-site-assets.md](../proposals/admin-site-assets.md).

## Decisions baked into the implementation

- **Browser-to-Blob uploads, never through the BFF.** Vercel Functions cap bodies at 4.5 MB. The BFF only mints tokens (`POST /admin/assets/upload-token`) and confirms publishes (`PUT /admin/assets/:slot`), where it verifies the blob with `head()` before trusting it.
- **Explicit confirm step instead of `onUploadCompleted`.** The Blob completion webhook does not reach localhost and is asynchronous; the PUT is testable and gives the UI a clear "Publicar".
- **Slot rules are one shared module** (`apps/web/shared/siteAssetSlots.ts`) imported by both the BFF and the admin SPA, so type and size limits cannot drift.
- **Immutable blobs, one per slot.** Uploads get `addRandomSuffix`; publishing a replacement deletes the previous blob. No version history in v1.
- **Poster is recommended, not required, for a video hero.** The proposal said required; the UI warns instead so an admin can publish a video first and the poster right after.
- **`BLOB_READ_WRITE_TOKEN` is optional.** Without it the public site serves defaults and the admin page is read-only with a notice. The public read also tolerates a missing `site_assets` table, so the code can deploy before the migration runs.

## Consequences

- One more Vercel resource (the Blob store) and one env var. Hobby plan: 1 GB storage and 10 GB transfer per month shared with the project; a video hero can exceed that and gets the store blocked for 30 days, which degrades to defaults but is still a visible regression. Pro removes the cap at about $0.05/GB.
- The 4.4 MB `OnaExperiences.jpeg` left the repo; the bundled default is a 1920 px re-encode (`hero-default.jpg`).
- Orphan blobs from abandoned uploads are possible but bounded by the token size cap; cleanup is a manual `list('site/')` for now.
