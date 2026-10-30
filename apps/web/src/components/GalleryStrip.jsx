import { useTranslation } from 'react-i18next';
import { itemImageAlt } from '../utils/imageAlt.js';
import { responsiveImage } from '../utils/responsiveImage.js';

function GalleryStrip({ item }) {
  const { t } = useTranslation();
  const gallery = Array.isArray(item.gallery) ? item.gallery.slice(0, 4) : [item.image];
  if (!gallery.length) return null;
  const alt = itemImageAlt(item, t);

  return (
    <div className="gallery-strip">
      {gallery.map((image, index) => (
        <div key={`${item.name}-${image}-${index}`} className={`gallery-thumb ${index === 0 ? 'gallery-thumb-main' : ''}`}>
          {/* Below the fold on detail pages: lazy, small variants. */}
          <img
            {...responsiveImage(image, '(min-width: 1024px) 200px, 25vw')}
            alt={gallery.length > 1 ? `${alt} (${index + 1})` : alt}
            width="480"
            height="480"
            loading="lazy"
            decoding="async"
            className="detail-gallery__img"
          />
        </div>
      ))}
    </div>
  );
}

export default GalleryStrip;
