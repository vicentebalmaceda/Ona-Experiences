import { useTranslation } from 'react-i18next';
import { itemImageAlt } from '../utils/imageAlt.js';

function GalleryStrip({ item }) {
  const { t } = useTranslation();
  const gallery = Array.isArray(item.gallery) ? item.gallery.slice(0, 4) : [item.image];
  if (!gallery.length) return null;
  const alt = itemImageAlt(item, t);

  return (
    <div className="gallery-strip">
      {gallery.map((image, index) => (
        <div
          key={`${item.name}-${image}-${index}`}
          className={`gallery-thumb ${index === 0 ? 'gallery-thumb-main' : ''}`}
          style={{ backgroundImage: `url('${image}')` }}
          role="img"
          aria-label={gallery.length > 1 ? `${alt} (${index + 1})` : alt}
        ></div>
      ))}
    </div>
  );
}

export default GalleryStrip;
