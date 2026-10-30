# Lighthouse baseline (production, before the SEO work)

Run on 2026-10-30 against https://www.onaexperiences.com with Lighthouse 12 (headless Chrome, default mobile and `--preset=desktop`). The raw reports are not committed. To regenerate, run Lighthouse against the same three URLs.

| Page | Form factor | Performance | Accessibility | Best practices | SEO | LCP | Transfer |
|---|---|---|---|---|---|---|---|
| `/` | mobile | 58 | 90 | 100 | 92 | 8.3 s | 12.6 MB |
| `/` | desktop | 70 | 90 | 100 | 92 | 3.4 s | 17.4 MB |
| `/lodges/2007` | mobile | 62 | 93 | 100 | 92 | 5.7 s | 1.0 MB |
| `/lodges/2007` | desktop | 85 | 93 | 100 | 92 | 1.8 s | 1.0 MB |
| `/quienes-somos` | mobile | 64 | 96 | 100 | 92 | 6.2 s | 0.8 MB |
| `/quienes-somos` | desktop | 98 | 96 | 100 | 92 | 1.1 s | 0.8 MB |

Failing audits on the home page:

- **SEO:** `robots-txt`. `/robots.txt` returned the HTML shell.
- **Accessibility:**
  - `aria-command-name` and `target-size` on the Leaflet markers.
  - `color-contrast` on the footer link to onaflyfishing.cl.
- **LCP element:** the 5.9 MB hero video, served from Vercel Blob.

Lighthouse's SEO category can't see the main indexing problems:

- no server-rendered content
- soft 404s
- both languages on one URL

[seo-deep-dive.md](../proposals/seo-deep-dive.md) covers those.
