/**
 * Build-time responsive images.
 *
 * For every raster image under public/assets/{lodges,guides,about}, writes
 * WebP variants at RESPONSIVE_WIDTHS to public/assets/_img/<dir>/<name>-<w>.webp
 * (gitignored). Both `vite dev` and `vite build` serve that folder as static
 * files. The client helper src/utils/responsiveImage.js builds the matching
 * srcset, so the naming scheme here and there must stay in sync.
 *
 * Incremental: a variant is skipped when it is newer than its source, so
 * repeat runs only stat files. Variants whose source was deleted are removed.
 *
 * Run directly (`node scripts/optimize-images.mjs`), via the predev/prebuild
 * npm scripts, or through the Vite plugin in vite.config.js (which covers a
 * Vercel build command of plain `vite build`).
 */
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RESPONSIVE_WIDTHS = [480, 960, 1600];
export const SOURCE_DIRS = ['lodges', 'guides', 'about'];
const SOURCE_EXT = /\.(jpe?g|png|webp|avif)$/i;
const WEBP_QUALITY = 72;

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(webRoot, 'public', 'assets');
const outRoot = path.join(assetsDir, '_img');

async function mtime(file) {
  try {
    return (await stat(file)).mtimeMs;
  } catch {
    return 0;
  }
}

async function listSources() {
  const jobs = [];
  for (const dir of SOURCE_DIRS) {
    let entries = [];
    try {
      entries = await readdir(path.join(assetsDir, dir));
    } catch {
      continue;
    }
    const seen = new Map();
    for (const file of entries.sort()) {
      if (!SOURCE_EXT.test(file)) continue;
      const name = file.replace(SOURCE_EXT, '');
      if (seen.has(name)) {
        console.warn(`[optimize-images] ${dir}/${file} and ${dir}/${seen.get(name)} share a name; skipping ${file}`);
        continue;
      }
      seen.set(name, file);
      jobs.push({ dir, file, name, src: path.join(assetsDir, dir, file) });
    }
  }
  return jobs;
}

function outputPath(dir, name, width) {
  return path.join(outRoot, dir, `${name}-${width}.webp`);
}

async function removeOrphans(jobs) {
  const expected = new Set(
    jobs.flatMap(({ dir, name }) => RESPONSIVE_WIDTHS.map((w) => outputPath(dir, name, w)))
  );
  let removed = 0;
  for (const dir of SOURCE_DIRS) {
    let entries = [];
    try {
      entries = await readdir(path.join(outRoot, dir));
    } catch {
      continue;
    }
    for (const file of entries) {
      const full = path.join(outRoot, dir, file);
      if (!expected.has(full)) {
        await rm(full, { force: true });
        removed += 1;
      }
    }
  }
  return removed;
}

export async function optimizeImages({ log = console.log } = {}) {
  const started = Date.now();
  const jobs = await listSources();

  // Collect the variants that are missing or older than their source.
  const work = [];
  for (const job of jobs) {
    const srcTime = await mtime(job.src);
    const stale = [];
    for (const width of RESPONSIVE_WIDTHS) {
      if ((await mtime(outputPath(job.dir, job.name, width))) <= srcTime) stale.push(width);
    }
    if (stale.length) work.push({ ...job, widths: stale });
  }

  const removed = await removeOrphans(jobs);

  if (work.length) {
    // Imported lazily so a no-op run (everything fresh) doesn't load libvips.
    const { default: sharp } = await import('sharp');
    sharp.cache(false);
    const concurrency = Math.max(1, Math.min(4, availableParallelism() - 1));
    let next = 0;
    let failed = 0;

    async function worker() {
      while (next < work.length) {
        const job = work[next++];
        try {
          await mkdir(path.join(outRoot, job.dir), { recursive: true });
          const input = sharp(job.src, { failOn: 'none' }).rotate();
          await Promise.all(
            job.widths.map((width) =>
              input
                .clone()
                .resize({ width, withoutEnlargement: true })
                .webp({ quality: WEBP_QUALITY, effort: 4 })
                .toFile(outputPath(job.dir, job.name, width))
            )
          );
        } catch (error) {
          failed += 1;
          console.warn(`[optimize-images] failed on ${job.dir}/${job.file}: ${error.message}`);
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
    // The client always advertises a srcset for these folders, so a missing
    // variant would be a broken image: fail loudly instead.
    if (failed) throw new Error(`${failed} source image(s) could not be converted`);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  log(
    `[optimize-images] ${jobs.length} sources, ${work.length} (re)generated, ${removed} orphan variant(s) removed in ${seconds}s`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  optimizeImages().catch((error) => {
    console.error('[optimize-images]', error);
    process.exit(1);
  });
}
