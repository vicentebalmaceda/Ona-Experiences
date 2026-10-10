import { describe, expect, it } from 'vitest';
import {
  HERO_IMAGE_MIN_WIDTH,
  HERO_VIDEO_MAX_SECONDS,
  LOGO_MIN_WIDTH,
  formatDimensions,
  formatDuration,
  formatPublishedAt,
  needsPosterHint,
  warningsForMedia
} from './siteAssetHints.js';

describe('warningsForMedia', () => {
  it('warns on a narrow hero image but not on a wide one', () => {
    expect(warningsForMedia('hero', { kind: 'image', width: HERO_IMAGE_MIN_WIDTH - 1, height: 900 })).toHaveLength(1);
    expect(warningsForMedia('hero', { kind: 'image', width: 1920, height: 1080 })).toEqual([]);
  });

  it('warns on a small or non-square logo', () => {
    expect(warningsForMedia('logo', { kind: 'image', width: LOGO_MIN_WIDTH - 40, height: LOGO_MIN_WIDTH - 40 })).toHaveLength(1);
    expect(warningsForMedia('logo', { kind: 'image', width: 512, height: 256 })).toHaveLength(1);
    expect(warningsForMedia('logo', { kind: 'image', width: 512, height: 512 })).toEqual([]);
  });

  it('warns on a long hero video only', () => {
    expect(
      warningsForMedia('hero', { kind: 'video', width: 1280, height: 720, durationSeconds: HERO_VIDEO_MAX_SECONDS + 1 })
    ).toHaveLength(1);
    expect(warningsForMedia('hero', { kind: 'video', width: 1280, height: 720, durationSeconds: 15 })).toEqual([]);
  });

  it('ignores posters and unknown media', () => {
    expect(warningsForMedia('hero_poster', { kind: 'image', width: 300, height: 200 })).toEqual([]);
    expect(warningsForMedia('hero', { kind: null })).toEqual([]);
    expect(warningsForMedia('hero', null)).toEqual([]);
  });
});

describe('formatters', () => {
  it('formats the publish date as dd-mm-yyyy', () => {
    expect(formatPublishedAt('2026-10-06T15:30:00.000Z')).toMatch(/^0[67]-10-2026$/);
    expect(formatPublishedAt('not-a-date')).toBe('');
    expect(formatPublishedAt(null)).toBe('');
  });

  it('formats dimensions and durations', () => {
    expect(formatDimensions(1920, 1080)).toBe('1920 × 1080');
    expect(formatDimensions(null, 1080)).toBe('');
    expect(formatDuration(12.4)).toBe('12 s');
    expect(formatDuration(65)).toBe('1 min 05 s');
    expect(formatDuration(null)).toBe('');
  });
});

describe('needsPosterHint', () => {
  it('is true only for a video hero without poster', () => {
    expect(needsPosterHint({ hero: { kind: 'video' }, hero_poster: null })).toBe(true);
    expect(needsPosterHint({ hero: { kind: 'video' }, hero_poster: { kind: 'image' } })).toBe(false);
    expect(needsPosterHint({ hero: { kind: 'image' }, hero_poster: null })).toBe(false);
    expect(needsPosterHint({ hero: null, hero_poster: null })).toBe(false);
    expect(needsPosterHint(null)).toBe(false);
  });
});
