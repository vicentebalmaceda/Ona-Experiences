# ONA Experiences - React + Tailwind

Proyecto ordenado en React JS + Tailwind CSS, manteniendo el contenido, imágenes, datos y diseño base del proyecto original.

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Luego abrir la URL local que muestra Vite, normalmente:

```bash
http://localhost:5173
```

## Cómo compilar versión final

```bash
npm run build
```

La versión compilada queda en la carpeta `dist/`.

## Estructura principal

```txt
src/
  App.jsx
  main.jsx
  data.js
  styles.css
  components/
    Header.jsx
    Hero.jsx
    MapSection.jsx
    DirectorySection.jsx
    DirectoryCard.jsx
    GalleryStrip.jsx
    RatingPanel.jsx
    PricingSection.jsx
    ContactSection.jsx
    Footer.jsx
  utils/
    rating.js
    map.js
public/
  assets/
    logo-ona.png
    lodges/
    guides/
```

## Qué se mejoró

- Se separó `App.jsx` en componentes simples y fáciles de entender.
- Se dejaron las funciones de calificación en `src/utils/rating.js`.
- Se dejaron las funciones del mapa en `src/utils/map.js`.
- Se mantuvo la información original en `src/data.js`.
- Se mantuvieron las imágenes originales en `public/assets/`.
- Se validó el proyecto con `npm run build`.

## Componentes principales

- `Header`: navegación superior.
- `Hero`: portada y filtros principales.
- `MapSection`: mapa interactivo con Leaflet.
- `DirectorySection`: sección reutilizable para Lodges y Guías.
- `DirectoryCard`: tarjeta individual de cada lodge o guía.
- `RatingPanel`: sistema simple de calificación con `localStorage`.
- `PricingSection`: sección de tarifas.
- `ContactSection`: formulario de contacto vía mailto.
- `Footer`: pie de página.
