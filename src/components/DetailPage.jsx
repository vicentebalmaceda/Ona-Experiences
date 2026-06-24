import CompactMap from './CompactMap.jsx';
import GalleryStrip from './GalleryStrip.jsx';
import RatingPanel from './RatingPanel.jsx';
import { getRatingStats, renderStars } from '../utils/rating.js';

function imageUrl(src) {
  if (!src) return '';
  return src.startsWith('http') ? src : `/${src.replace(/^\/?/, '')}`;
}

function feeTextFor(item) {
  return item.type === 'Lodge'
    ? '$200.000 mensual + 10% comisión desde la segunda reserva'
    : '$50.000 mensual';
}

function normalizedPhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

function DetailPage({ item, ratingVersion, onRate, onBack, onNavigate }) {
  const stats = getRatingStats(item, ratingVersion);
  const gallery = item.gallery?.length ? item.gallery : [item.image];
  const displayGallery = [...gallery, item.image, item.image].filter(Boolean).slice(0, 5);
  const phone = normalizedPhone(item.phone);
  const mailSubject = encodeURIComponent(`Solicitud de disponibilidad - ${item.name}`);
  const mailBody = encodeURIComponent(`Hola, quiero solicitar disponibilidad para ${item.name}.\n\nZona: ${item.zone}\nTipo: ${item.type}\n\nGracias.`);

  return (
    <section className="detail-page min-h-screen pt-28">
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
            <span aria-hidden="true">←</span> Volver al directorio
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate(item.type === 'Lodge' ? 'lodges-section' : 'guias-section')} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Ver otros {item.type === 'Lodge' ? 'lodges' : 'guías'}</button>
            <button type="button" onClick={() => onNavigate('contacto')} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">Contacto ONA</button>
          </div>
        </div>

        <div className="detail-title-card">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-deep/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-deep">{item.type}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-600">{item.zone}</span>
            </div>
            <h1 className="font-display text-4xl leading-tight text-slate-950 sm:text-6xl">{item.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">Ficha detallada con reseña, calificación, comentarios, contacto y opción para solicitar agenda.</p>
          </div>
          <div className="detail-rating-box">
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Calificación</p>
              <p className="mt-1 text-4xl font-black text-slate-950">{stats.average.toFixed(1)}</p>
            </div>
            <div>
              <p className="rating-stars text-xl leading-none">{renderStars(stats.average)}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{stats.reviews} reseñas registradas</p>
            </div>
          </div>
        </div>

        <div className="detail-gallery mt-7">
          <div className="detail-gallery-main" style={{ backgroundImage: `url('${imageUrl(displayGallery[0])}')` }}></div>
          {displayGallery.slice(1, 5).map((src, index) => (
            <div key={`${src}-${index}`} className="detail-gallery-thumb" style={{ backgroundImage: `url('${imageUrl(src)}')` }}></div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-6">
            <section className="detail-content-card">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">Resumen</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Reseña del perfil</h2>
                </div>
                <span className="rounded-full bg-mist px-4 py-2 text-sm font-black text-deep">{item.ratingLabel || 'Muy recomendado'}</span>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <div className="detail-fact"><span>Tipo</span><strong>{item.type}</strong></div>
                <div className="detail-fact"><span>Zona</span><strong>{item.zone}</strong></div>
                <div className="detail-fact"><span>Tarifa visible</span><strong>{feeTextFor(item)}</strong></div>
              </div>
              <p className="mt-6 text-base leading-8 text-slate-600">{item.name} aparece registrado en la zona de {item.zone}. La ficha mantiene la información disponible actualmente y deja el espacio listo para que el backend agregue disponibilidad, más reseñas, servicios incluidos y reservas reales.</p>
              {item.representative ? <p className="mt-4 text-base leading-8 text-slate-600">Representante informado: <span className="font-bold text-slate-900">{item.representative}</span>.</p> : null}
            </section>

            <section className="detail-content-card">
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">Mapa</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Ubicación</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Mapa integrado con el mismo punto usado en el directorio. Está listo para conectar filtros, disponibilidad o rutas desde una API.</p>
                  <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700">
                    <p><span className="font-bold text-slate-950">Teléfono:</span> {item.phone || 'No informado'}</p>
                    <p className="mt-2 break-words"><span className="font-bold text-slate-950">Email:</span> {item.email || 'No informado'}</p>
                    <p className="mt-2"><span className="font-bold text-slate-950">Coordenadas:</span> {item.lat}, {item.lng}</p>
                  </div>
                </div>
                <div className="detail-map-shell">
                  <CompactMap items={[item]} ratingVersion={ratingVersion} onSelect={() => {}} ariaLabel={`Mapa de ${item.name}`} />
                </div>
              </div>
            </section>

            <section className="detail-content-card">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">Comentarios y recomendaciones</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Opiniones estilo Booking</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="review-summary-card">
                  <span>★</span>
                  <strong>{stats.average.toFixed(1)} / 5</strong>
                  <p>Calificación promedio visible en el directorio.</p>
                </div>
                <div className="review-summary-card">
                  <span>✓</span>
                  <strong>{stats.reviews} reseñas</strong>
                  <p>Base de reseñas lista para crecer desde backend.</p>
                </div>
                <div className="review-summary-card">
                  <span>↗</span>
                  <strong>{item.ratingLabel || 'Muy recomendado'}</strong>
                  <p>Etiqueta actual de evaluación.</p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">Recomendación antes de agendar</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Confirmar disponibilidad, temporada, condiciones del río, servicios incluidos, traslados y forma de pago directamente con el contacto informado.</p>
              </div>
              <RatingPanel item={item} ratingVersion={ratingVersion} onRate={onRate} />
            </section>

            <section className="detail-content-card overflow-hidden p-0">
              <GalleryStrip item={item} />
            </section>
          </div>

          <aside className="booking-panel">
            <div className="booking-panel__inner">
              <div className="rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Agenda</p>
                <h2 className="mt-2 text-2xl font-black">Solicitar disponibilidad</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Flujo preparado para que backend conecte reservas reales, calendario y pagos.</p>
              </div>

              <div className="mt-5 space-y-4">
                <label className="booking-field">
                  <span>Fecha estimada</span>
                  <input type="date" />
                </label>
                <label className="booking-field">
                  <span>Personas</span>
                  <select defaultValue="2">
                    <option value="1">1 persona</option>
                    <option value="2">2 personas</option>
                    <option value="3">3 personas</option>
                    <option value="4">4 personas</option>
                    <option value="5+">5+ personas</option>
                  </select>
                </label>
                <label className="booking-field">
                  <span>Mensaje</span>
                  <textarea rows="4" placeholder="Ej: fechas, nivel de experiencia, zona de interés"></textarea>
                </label>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Tarifa visible</p>
                <p className="mt-2 text-lg font-black text-slate-950">{feeTextFor(item)}</p>
              </div>

              <a href={`mailto:${item.email}?subject=${mailSubject}&body=${mailBody}`} className="mt-5 block rounded-2xl bg-deep px-5 py-4 text-center font-black text-white shadow-card transition hover:-translate-y-0.5 hover:bg-deep/90">Solicitar por email</a>
              {phone ? <a href={`tel:${phone}`} className="mt-3 block rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center font-black text-slate-900 transition hover:bg-slate-50">Llamar contacto</a> : null}
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">Esta acción no confirma reserva. Solo prepara la solicitud de contacto.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default DetailPage;
