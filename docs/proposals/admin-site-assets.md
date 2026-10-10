---
status: accepted
date: 2026-10-10
implemented: 2026-10-10 (see docs/adr/0006-site-assets-vercel-blob.md)
---

# Admin-managed site assets (hero image or video, logo)

Proposal for letting the client replace the landing hero (image or looping video) and the logo from `/admin`, without a code deploy. Written after a deep dive into the current app and the Vercel platform limits. Implemented as proposed; deviations are listed in ADR 0006.

## 1. Where things stand today

| Asset | Where it is rendered | How it is wired |
|---|---|---|
| Hero background | `apps/web/src/components/Hero.jsx` | Tailwind utility `bg-hero`, defined in `tailwind.config.js` as `url('/assets/OnaExperiences.jpeg')`. The file is a 4.4 MB, 4032x3024 drone photo committed in `public/assets`. |
| Logo (round) | `Header.jsx`, favicon in `index.html` | Hard-coded `/assets/logo-ona.png` (240x240, 31 KB). |
| Admin wordmark | `src/admin/components/AdminBrand.jsx` | Hard-coded `/assets/ona-experience.png`. |

Everything is a static file inside the Vite build. Changing any of them means a commit and a Vercel deploy. There is no file storage in the stack: the BFF is Vercel serverless functions, data lives in Neon Postgres (ADR 0001), KV is optional and currently unused.

Constraints that shape the design:

- **Vercel Functions cap request bodies at 4.5 MB** (`FUNCTION_PAYLOAD_TOO_LARGE`). A hero image already exceeds that; a video certainly does. Uploads cannot go through our API.
- **Vercel's own guidance is not to serve video from the deployment's static assets** (bandwidth), and to use Blob or a dedicated host instead.
- The public site is a SPA with no SSR, so any runtime-configurable asset is known only after a fetch. We need a fallback that renders instantly.
- `/admin` already has session-cookie auth (ADR 0005), a service container, Zod validation, and a page/nav pattern we can extend.

## 2. Goals and non-goals

Goals:

- An admin can upload a new hero (image, or a muted looping video with a poster) and a new logo, preview them, and publish them. The public site reflects the change within about a minute, no deploy.
- "Restore default" always works, so a bad upload can never leave the site broken.
- Hard limits on type and size so the client cannot accidentally publish a 200 MB video.

Non-goals for v1:

- A general media library or gallery management (lodge and guide photos stay in the repo and in BSale).
- Server-side transcoding or image resizing. We validate and guide; we do not transform.
- Multi-user audit trails beyond "who changed it, when".

## 3. Options considered

| Option | Verdict | Why |
|---|---|---|
| **Vercel Blob (public store) + a `site_assets` table in Postgres** | **Recommended** | Same platform and dashboard we already use. Direct browser-to-Blob uploads bypass the 4.5 MB function limit. Blob URLs are CDN-served and immutable, so cache busting is free. SDK is one package. Free tier on Hobby, cheap on Pro. |
| Cloudinary (or similar media CDN) | Good second choice | Adds automatic resizing, format conversion and video transcoding, which Blob does not do. Costs another vendor, API keys, and an upload-preset setup. Worth it only if the client will upload raw phone videos and expects the site to fix them. |
| S3 + CloudFront | No | Same capability as Blob with far more setup (IAM, bucket policy, CORS, signed uploads). |
| Commit files to GitHub through its API and let Vercel redeploy | No | Every change is a 1 to 2 minute deploy, Git is a poor store for binaries, and it couples the admin panel to repo credentials. |
| Store bytes in Postgres | No | Neon is not a file CDN; a video would blow row limits and bandwidth. |

Decision: Vercel Blob. The Cloudinary route is kept as a documented v2 upgrade if transcoding becomes a real need.

## 4. Proposed design

### 4.1 Vocabulary (for CONTEXT.md once accepted)

- **Asset Slot**: a named place on the public site an admin can fill: `hero` and `logo` in v1 (`hero_poster` as a companion of a video hero). Slots are fixed in code; admins do not create slots.
- **Site Asset**: the file currently published in a slot, with its public URL, kind (`image` | `video`), content type, size, optional dimensions, alt text, and who published it when. A slot with no Site Asset renders its **bundled default** from `public/assets`.

### 4.2 Storage

One public Vercel Blob store connected to the project (Production, Preview and Development environments). Blobs are written under `site/<slot>/<timestamp>-<original-name>` with `addRandomSuffix: true`, so every upload gets a new immutable URL and the CDN cache never serves stale content.

Postgres gets one table:

```sql
CREATE TABLE IF NOT EXISTS site_assets (
  slot text PRIMARY KEY CHECK (slot IN ('hero', 'hero_poster', 'logo')),
  kind text NOT NULL CHECK (kind IN ('image', 'video')),
  url text NOT NULL,
  pathname text NOT NULL,          -- blob pathname, used to verify and to delete
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  width integer,
  height integer,
  alt text,
  published_by text NOT NULL,      -- admin email
  published_at timestamptz NOT NULL DEFAULT now()
);
```

Previous versions are not kept in v1. "Restore default" deletes the row and the blob. If the client later wants "undo", a `site_asset_history` table with the same columns plus an id is a small addition.

### 4.3 API

Public, cached:

- `GET /api/v1/site/assets` → `{ hero: {kind, url, posterUrl, alt} | null, logo: {kind, url, alt} | null, version }`. Served with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and the BFF memory cache, so the landing page costs one tiny JSON request and almost never hits Postgres.

Admin, session-cookie protected (same `requireAdminSession` as the other admin routes):

- `POST /api/v1/admin/assets/upload-token`: the `handleUpload` endpoint from `@vercel/blob/client`. In `onBeforeGenerateToken` it checks the session, reads the target slot from `clientPayload`, and returns `allowedContentTypes`, `maximumSizeInBytes` and the pathname prefix for that slot. Without a valid admin session no token is issued, so the store cannot be written from outside.
- `PUT /api/v1/admin/assets/:slot` with `{ pathname, alt, width, height }`: the confirmation step after the browser upload. The server calls `head(pathname)` on Blob to verify the blob exists, is under `site/<slot>/`, and matches the slot's content-type and size rules, then upserts `site_assets`, deletes the previously published blob for that slot, and clears the cache entry. It never trusts a URL sent by the browser.
- `DELETE /api/v1/admin/assets/:slot`: restore default. Deletes the row and the blob.

Why a separate confirm step instead of Blob's `onUploadCompleted` callback: that callback is a webhook from Vercel to the deployed URL, so it never fires on localhost, and it is asynchronous. The explicit PUT is testable, works in local dev, and gives the admin UI a clear "Publicar" moment. The callback can be added later as a safety net to clean up blobs that were uploaded but never confirmed.

### 4.4 Upload flow

```
Admin browser                     BFF (Vercel Function)              Vercel Blob
     |-- select file, check type/size/dimensions locally
     |-- POST upload-token {slot} -->|-- requireAdminSession
     |                               |-- rules for slot ------------>| (token)
     |<------------- client token ---|                                |
     |-- PUT file directly (multipart, progress events) ------------>|
     |<------------- {url, pathname} --------------------------------|
     |-- PUT admin/assets/:slot {pathname, alt} -->|-- head(pathname) verify
     |                                             |-- upsert site_assets
     |                                             |-- del(old blob), cache clear
     |<-------------------- 200 {asset} -----------|
```

The file never touches our function, so the 4.5 MB limit does not apply and uploads carry no data-transfer charge.

### 4.5 Public site changes

- `src/site/SiteAssetsProvider.jsx`: fetches `/api/v1/site/assets` once on load, exposes `useSiteAsset(slot)` returning `{ kind, url, posterUrl, alt, isDefault }`. Defaults are the current files in `public/assets`, so the site renders immediately with what it shows today and swaps to the published asset when the JSON arrives (typically under 100 ms from CDN). The last known value is also cached in `localStorage` to avoid the swap on repeat visits.
- `Hero.jsx`: drops the `bg-hero` utility. Renders an absolutely positioned `<img>` (image hero) or `<video autoPlay muted loop playsInline poster>` (video hero) behind the existing text. `onError` on either element falls back to the bundled default, so a deleted or blocked blob can never show a blank hero.
- `Header.jsx`: logo `src` comes from `useSiteAsset('logo')`. `DocumentMeta.jsx` updates the favicon link to the same URL when the logo is a PNG.
- `tailwind.config.js`: remove the `hero` background image entry.
- Optional, recommended: move the 4.4 MB `OnaExperiences.jpeg` out of the repo by publishing it as the first hero Site Asset and keeping a 300 KB compressed version as the bundled default. That alone cuts the deployment size and the landing page's largest request.

### 4.6 Admin page

New sidebar entry "Sitio" with one card per slot, following the `admin-surface` style already used by Resumen:

- Live preview of the current asset (image, or video playing muted) with a "Por defecto" badge when nothing is published.
- Spec line: accepted formats, max size, recommended dimensions.
- File picker with client-side checks before anything is uploaded: type, size, and for images the pixel dimensions (via `Image()`), for video the duration and dimensions (via a detached `<video>` element).
- Progress bar during upload (`upload()` from `@vercel/blob/client` reports `onUploadProgress`).
- Alt text field (logo and image hero).
- For a video hero, a second picker for the poster image, required before "Publicar" is enabled.
- Buttons: "Publicar" (runs the confirm PUT) and "Restaurar por defecto". Footer: "Publicado por correo@ el dd-mm-yyyy".

### 4.7 Limits and validation

| Slot | Accepted | Max size | Recommended |
|---|---|---|---|
| `logo` | PNG, WebP, SVG | 1 MB | square, at least 240x240, transparent background |
| `hero` (image) | JPEG, WebP | 6 MB | 1920x1080 or larger, 16:9, compressed for web |
| `hero` (video) | MP4 (H.264), WebM | 25 MB | 1280x720 or 1920x1080, 10 to 20 s, no audio track, loop-friendly |
| `hero_poster` | JPEG, WebP | 2 MB | same framing as the first video frame |

Limits are enforced three times: in the browser (early feedback), in the Blob token (`allowedContentTypes`, `maximumSizeInBytes`, so an uploaded file cannot exceed them even if the UI is bypassed), and in the confirm PUT (`head()` check). SVG logos are only ever rendered through `<img>`, where embedded scripts do not execute.

### 4.8 Caching

- Blob URLs are unique per upload, so they get the default 1 month CDN and browser cache and never go stale.
- The assets JSON is cached 60 s at the CDN and in the BFF memory cache; the confirm PUT clears the memory cache. Worst case an admin sees the old hero for a minute on the public site. The admin page itself reads with `cache: 'no-store'` so it always shows the truth.

### 4.9 Cost (Vercel Blob, as of 2026-09)

| | Hobby | Pro |
|---|---|---|
| Storage | 1 GB/month included | $0.023/GB-month |
| Data transfer | 10 GB/month included, shared with the rest of the project | about $0.05/GB (region-priced) |
| Operations | 10k simple, 2k advanced included | $0.40 and $5.00 per million |

Storage and operations are negligible for three files. **Data transfer is the one number to watch, and only for video.** A 20 MB looping hero at 2,000 landing visits a month is 40 GB. On Hobby that exceeds the 10 GB allowance, and Vercel then blocks the Blob store for 30 days (no overage billing on Hobby), which would also take the logo down. On Pro it is about $2/month. Two mitigations are built into the design: the 25 MB cap, and the `onError` fallback to bundled defaults so a blocked store degrades to today's static hero instead of a blank. If the project is on Hobby, the honest recommendation is image hero only, or video kept under about 8 MB.

Need to confirm: which plan the Vercel project is on.

### 4.10 Security

- Tokens are only minted for a valid admin session; the token is scoped to one pathname prefix, allowed types and a max size, and expires in minutes.
- The confirm step verifies against Blob, so the database can only ever point at blobs in our store under the expected prefix.
- `BLOB_READ_WRITE_TOKEN` stays server-side (needed by `handleUpload`); nothing Blob-related ships in the SPA bundle.
- Restore default and overwrite delete old blobs, so the store holds at most one file per slot plus whatever an interrupted upload left behind (cleanup script or `onUploadCompleted` later).

### 4.11 Local development

`vercel env pull` (after connecting the store with the Development environment) adds `BLOB_READ_WRITE_TOKEN` to `apps/web/.env`. The token exchange is an ordinary request to the local BFF, and the browser uploads straight to Blob, so the full flow works on localhost. `env.ts` declares the token optional: without it the public site works with defaults and the admin "Sitio" page shows a "no configurado" notice instead of failing.

## 5. Rollout plan

1. **Platform**: create the public Blob store in the Vercel project, connect it to Production, Preview and Development, pull env. Add `site_assets` to `schema.sql` and run it against Neon. About an hour, needs your Vercel access.
2. **Read path** (one PR): table + store class, `GET /site/assets` with caching, `SiteAssetsProvider`, Hero and Header reading from it with defaults and `onError` fallback, Tailwind cleanup, unit tests. Ships dark: with no rows, the site is pixel-identical to today.
3. **Write path** (one PR): `@vercel/blob` dependency, upload-token and confirm/restore handlers, slot rules module with tests, admin "Sitio" page with previews, validation and progress.
4. **Polish**: publish the current hero as the first Site Asset and shrink the bundled default, favicon follow-the-logo, history/undo if wanted.

Rough effort: 2 and 3 are a day each; 1 and 4 are half a day together. Each PR is independently deployable.

## 6. Risks and how they are handled

- **Blob store blocked on Hobby after a traffic spike**: `onError` fallback plus size caps; recommend Pro if video is a must.
- **Flash of default hero before the JSON loads**: mitigated by CDN caching and the `localStorage` memo; eliminated only with SSR, which is out of scope.
- **Client uploads an unoptimized file that passes the caps**: specs in the UI and dimension checks; no automatic optimization in v1 (Cloudinary is the upgrade path).
- **Orphan blobs from abandoned uploads**: bounded by the token size cap; a small cleanup script listing `site/` and deleting unreferenced blobs can run manually or as a cron later.
- **A second admin publishes at the same time**: last write wins on a single row; acceptable for one or two operators.

## 7. Decisions needed from you

1. Vercel plan: Hobby or Pro? This decides whether a video hero is advisable.
2. Video hero in v1, or image-only first and video later?
3. Should the favicon follow the uploaded logo, or stay as the bundled round logo?
4. Keep version history with an undo, or is "restore default" enough for v1?
5. Any other slot you already know you want (for example the footer logo, the admin wordmark, or the OG share image)? Adding a slot is a one-line rule plus a card.
