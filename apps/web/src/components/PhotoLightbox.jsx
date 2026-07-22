import { useEffect, useRef } from 'react';

const SWIPE_THRESHOLD_PX = 40;

function PhotoLightbox({ images, index, open, onClose, onIndexChange, alt = 'Foto' }) {
  const closeRef = useRef(null);
  const touchStartX = useRef(null);

  const count = images?.length ?? 0;
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const currentSrc = count > 0 ? images[safeIndex] : '';

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onIndexChange((safeIndex - 1 + count) % count);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onIndexChange((safeIndex + 1) % count);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, onIndexChange, safeIndex, count]);

  if (!open || count === 0) return null;

  function goPrev() {
    onIndexChange((safeIndex - 1 + count) % count);
  }

  function goNext() {
    onIndexChange((safeIndex + 1) % count);
  }

  function onTouchStart(event) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event) {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) goPrev();
    else goNext();
  }

  return (
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Galería de fotos"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="photo-lightbox__toolbar" onClick={(event) => event.stopPropagation()}>
        <p className="photo-lightbox__counter">
          {safeIndex + 1} / {count}
        </p>
        <button
          ref={closeRef}
          type="button"
          className="photo-lightbox__close"
          onClick={onClose}
          aria-label="Cerrar galería"
        >
          ×
        </button>
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            className="photo-lightbox__nav photo-lightbox__nav--prev"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="photo-lightbox__nav photo-lightbox__nav--next"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            aria-label="Foto siguiente"
          >
            ›
          </button>
        </>
      ) : null}

      <div className="photo-lightbox__stage" onClick={(event) => event.stopPropagation()}>
        <img src={currentSrc} alt={`${alt} ${safeIndex + 1}`} className="photo-lightbox__image" />
      </div>
    </div>
  );
}

export default PhotoLightbox;
