import useInViewOnce from '../../hooks/useInViewOnce.js';

/**
 * "ONA Experiences" with a hand-drawn gold underline that draws itself once
 * the text is visible (styles: `.brand-mark` in styles.css).
 * Children come from the translation string (<brand>…</brand>), so the brand
 * name stays editable in the locale files.
 */
function BrandMark({ children }) {
  const [ref, inView] = useInViewOnce();

  return (
    <span ref={ref} className={`brand-mark${inView ? ' is-drawn' : ''}`}>
      {children}
      <svg
        className="brand-mark__stroke"
        viewBox="0 0 200 14"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3 10.5C42 5.5 88 4 128 5.2c27 .8 49 2.6 69 .3" />
      </svg>
    </span>
  );
}

export default BrandMark;
