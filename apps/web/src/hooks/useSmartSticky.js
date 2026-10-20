import { useEffect } from 'react';

/**
 * Direction-aware sticky sidebar ("smart sticky").
 *
 * For a panel shorter than the viewport this is plain `position: sticky; top`.
 * For a panel taller than the viewport it pins the panel's BOTTOM edge while
 * scrolling down and its TOP edge while scrolling up, scrolling freely with the
 * page in between, so every part of the panel is reachable at any time.
 *
 * The element is expected to live inside a column that is at least as tall as
 * the content it should travel alongside (a stretched grid item). The browser's
 * own sticky containment keeps the panel inside that column; this hook only
 * decides which edge is pinned and when the panel scrolls freely.
 *
 * Styles are applied imperatively so scrolling never triggers React renders.
 */
export default function useSmartSticky(ref, {
  topOffset = 0,
  bottomGap = 0,
  minWidth = 0,
} = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;

    const column = el.parentElement;
    const mql = window.matchMedia(`(min-width: ${minWidth}px)`);

    let mode = 'top'; // 'top' | 'bottom' | 'free' | 'simple' | 'off'
    let lastScrollY = window.scrollY;

    const clearStyles = () => {
      el.style.position = '';
      el.style.top = '';
      el.style.marginTop = '';
    };

    const fitsViewport = () => (
      el.offsetHeight + topOffset + bottomGap <= window.innerHeight
    );

    const pinTop = () => {
      mode = 'top';
      el.style.position = 'sticky';
      el.style.top = `${topOffset}px`;
      el.style.marginTop = '0px';
    };

    const pinBottom = () => {
      mode = 'bottom';
      el.style.position = 'sticky';
      el.style.top = `${window.innerHeight - bottomGap - el.offsetHeight}px`;
      el.style.marginTop = '0px';
    };

    // Freeze the panel where it currently is, relative to its column, so it
    // scrolls with the page until it reaches the opposite edge.
    const release = () => {
      mode = 'free';
      const offset = el.getBoundingClientRect().top - column.getBoundingClientRect().top;
      const maxOffset = Math.max(0, column.offsetHeight - el.offsetHeight);
      el.style.position = 'relative';
      el.style.top = '0px';
      el.style.marginTop = `${Math.min(Math.max(0, Math.round(offset)), maxOffset)}px`;
    };

    const settle = () => {
      if (!mql.matches) {
        mode = 'off';
        clearStyles();
        return;
      }
      if (fitsViewport()) {
        mode = 'simple';
        el.style.position = 'sticky';
        el.style.top = `${topOffset}px`;
        el.style.marginTop = '0px';
        return;
      }
      // Tall panel: let it float from where it is; the next scroll re-pins it
      // to the correct edge.
      release();
    };

    // Scroll events already arrive at most once per frame; no extra throttling.
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY;
      lastScrollY = y;
      if (!delta || mode === 'off' || mode === 'simple') return;

      const rect = el.getBoundingClientRect();
      const down = delta > 0;

      if (mode === 'top' && down) {
        release();
      } else if (mode === 'bottom' && !down) {
        release();
      } else if (mode === 'free') {
        if (down && rect.bottom <= window.innerHeight - bottomGap) pinBottom();
        else if (!down && rect.top >= topOffset) pinTop();
      }
    };

    settle();
    if (mode === 'free') pinTop(); // initial state matches a classic sticky-top panel

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(settle)
      : null;
    resizeObserver?.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', settle);
    mql.addEventListener('change', settle);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', settle);
      mql.removeEventListener('change', settle);
      clearStyles();
    };
  }, [ref, topOffset, bottomGap, minWidth]);
}
