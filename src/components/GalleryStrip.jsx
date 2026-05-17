function GalleryStrip({ item }) {
  const gallery = Array.isArray(item.gallery) ? item.gallery.slice(0, 4) : [item.image];
  if (!gallery.length) return null;

  return (
    <div className="gallery-strip">
      {gallery.map((image, index) => (
        <div key={`${item.name}-${image}-${index}`} className={`gallery-thumb ${index === 0 ? 'gallery-thumb-main' : ''}`} style={{ backgroundImage: `url('${image}')` }}></div>
      ))}
    </div>
  );
}

export default GalleryStrip;
