import { describe, expect, it } from 'vitest';
import {
  blobPrefixForSlot,
  buildBlobPathname,
  checkFileForSlot,
  HERO_IMAGE_MAX_BYTES,
  isSiteAssetSlot,
  kindForContentType,
  SLOT_RULES
} from './siteAssetSlots.js';

const MB = 1024 * 1024;

describe('site asset slot rules', () => {
  it('recognizes the fixed slots only', () => {
    expect(isSiteAssetSlot('hero')).toBe(true);
    expect(isSiteAssetSlot('logo')).toBe(true);
    expect(isSiteAssetSlot('banner')).toBe(false);
    expect(isSiteAssetSlot(undefined)).toBe(false);
  });

  it('maps content types to kinds', () => {
    expect(kindForContentType('image/webp')).toBe('image');
    expect(kindForContentType('video/mp4')).toBe('video');
    expect(kindForContentType('application/pdf')).toBeNull();
  });

  it('accepts a hero image under the image cap and rejects one above it', () => {
    expect(checkFileForSlot('hero', 'image/jpeg', HERO_IMAGE_MAX_BYTES).ok).toBe(true);
    const tooBig = checkFileForSlot('hero', 'image/jpeg', HERO_IMAGE_MAX_BYTES + 1);
    expect(tooBig.ok).toBe(false);
    expect(tooBig.reason).toMatch(/máximo/);
  });

  it('lets a hero video use the larger slot cap', () => {
    expect(checkFileForSlot('hero', 'video/mp4', 20 * MB).ok).toBe(true);
    expect(checkFileForSlot('hero', 'video/mp4', SLOT_RULES.hero.maxSizeBytes + 1).ok).toBe(false);
  });

  it('rejects content types a slot does not allow', () => {
    expect(checkFileForSlot('logo', 'image/jpeg').ok).toBe(false);
    expect(checkFileForSlot('hero_poster', 'video/mp4').ok).toBe(false);
    expect(checkFileForSlot('logo', 'image/svg+xml', 10_000).ok).toBe(true);
  });

  it('builds pathnames under the slot prefix with a safe file name', () => {
    const pathname = buildBlobPathname('hero', 'Mi Vídeo FINAL (v2).mp4', new Date('2026-10-10T12:34:56.789Z'));
    expect(pathname.startsWith(blobPrefixForSlot('hero'))).toBe(true);
    expect(pathname).toBe('site/hero/20261010T123456Z-mi-v-deo-final-v2-.mp4');
    expect(buildBlobPathname('logo', '***')).toMatch(/^site\/logo\/\d{8}T\d{6}Z-asset$/);
  });
});
