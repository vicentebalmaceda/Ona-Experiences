import { kindForContentType } from '../../../shared/siteAssetSlots.ts';

/**
 * Browser-only helpers that read the intrinsic size (and duration) of a file
 * the admin picked, before anything is uploaded. Every object URL is revoked
 * once the metadata is known or the load fails.
 */

function withObjectUrl(file, run) {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    run(
      url,
      (value) => {
        URL.revokeObjectURL(url);
        resolve(value);
      },
      (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      }
    );
  });
}

export function probeImage(file) {
  return withObjectUrl(file, (url, done, fail) => {
    const image = new Image();
    image.onload = () => done({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => fail(new Error('No se pudo leer la imagen.'));
    image.src = url;
  });
}

export function probeVideo(file) {
  return withObjectUrl(file, (url, done, fail) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      const durationSeconds = Number.isFinite(video.duration) ? video.duration : null;
      done({ width: video.videoWidth, height: video.videoHeight, durationSeconds });
      video.removeAttribute('src');
      video.load();
    };
    video.onerror = () => fail(new Error('No se pudo leer el video.'));
    video.src = url;
  });
}

/**
 * Returns `{ kind, width, height, durationSeconds }` for an image or video
 * file; `durationSeconds` is null for images. Unknown types resolve with
 * `kind: null` and no dimensions instead of throwing.
 */
export async function describeMedia(file) {
  const kind = kindForContentType(file.type || '');
  if (kind === 'image') {
    const { width, height } = await probeImage(file);
    return { kind, width, height, durationSeconds: null };
  }
  if (kind === 'video') {
    const { width, height, durationSeconds } = await probeVideo(file);
    return { kind, width, height, durationSeconds };
  }
  return { kind: null, width: null, height: null, durationSeconds: null };
}
