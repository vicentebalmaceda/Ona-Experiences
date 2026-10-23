import { useEffect, useRef, useState } from 'react';

/**
 * One-shot visibility flag: returns [ref, inView], where inView turns true the
 * first time the element enters the viewport and then stays true. Used for
 * reveal effects that should play once and not replay when scrolling back.
 */
export default function useInViewOnce({ rootMargin = '0px 0px -8% 0px', threshold = 0.6 } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return undefined;

    // Without IntersectionObserver, skip the effect and show the final state.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin, threshold]);

  return [ref, inView];
}
