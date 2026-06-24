# ONA Experiences — React + Tailwind

Directorio profesional de lodges y guías para ONA Experiences.

## Qué incluye esta versión

- Header visual conservado con navegación superior: Mapa, Lodges, Guías, Tarifas y Contacto.
- Home / Hoja 1 con hero principal, imagen de fondo y métricas actuales.
- Sección Lodges / Hoja 2: foto editorial, listado compacto y mapa integrado en la misma pantalla.
- Sección Guías / Hoja 3: foto editorial, listado compacto y mapa integrado en la misma pantalla.
- Ficha detalle / Hoja 4: al hacer click en cualquier lodge o guía se abre una pantalla tipo Booking con galería, reseña, calificaciones, comentarios/recomendaciones, mapa y panel para solicitar agenda.
- Diseño responsive para desktop, tablet y móvil.
- Información base mantenida en `src/data.js`.

## Instalación

```bash
npm install
npm run dev
```

## Build producción

```bash
npm run build
npm run preview
```

## Estructura relevante

```txt
src/
  App.jsx                         # Estado principal, navegación y selección de ficha
  data.js                         # Data actual de lodges y guías
  components/
    Header.jsx                    # Header fijo visualmente igual al diseño original
    Hero.jsx                      # Hoja 1
    ExperienceSection.jsx         # Hoja 2 y Hoja 3: foto + listado + mapa
    CompactMap.jsx                # Mapa Leaflet reutilizable
    DetailPage.jsx                # Hoja 4: ficha detalle tipo Booking
    PricingSection.jsx            # Tarifas
    ContactSection.jsx            # Contacto sin backend
  utils/
    map.js                        # Marcadores y popup del mapa
    rating.js                     # Calificaciones locales
```

## Puntos pensados para backend

1. Reemplazar `lodges` y `guides` en `src/data.js` por una llamada API.
2. Conectar disponibilidad real en `DetailPage.jsx`, sección `booking-panel`.
3. Reemplazar reseñas/calificaciones locales de `utils/rating.js` por endpoint de reviews.
4. Conectar formulario de contacto de `ContactSection.jsx` a backend, Formspree, EmailJS o CRM.
5. Mantener la estructura esperada por cada item:

```js
{
  name: 'Nombre',
  zone: 'Zona',
  phone: 'Teléfono',
  email: 'Correo',
  representative: 'Representante opcional',
  lat: -45.575,
  lng: -72.066,
  image: 'assets/...',
  gallery: ['assets/...'],
  rating: 4.8,
  reviews: 22,
  ratingLabel: 'Etiqueta visible'
}
```
