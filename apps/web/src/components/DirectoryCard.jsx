import { Link } from 'react-router-dom';
import GalleryStrip from './GalleryStrip.jsx';
import RatingPanel from './RatingPanel.jsx';
import { getRatingStats, renderStars } from '../utils/rating.js';

function DirectoryCard({ item, ratingVersion, onRate }) {
  const feeText = item.type === 'Lodge'
    ? '$200.000 mensual + 10% comisión desde la segunda reserva'
    : '$50.000 mensual';
  const stats = getRatingStats(item, ratingVersion);
  const detailPath = item.productId
    ? item.type === 'Lodge'
      ? `/lodges/${item.productId}`
      : `/guides/${item.productId}`
    : null;

  const cardContent = (
    <>
      <div className="relative h-60 overflow-hidden bg-slate-200">
        <div className="absolute inset-0 bg-cover bg-center transition duration-500 hover:scale-105" style={{ backgroundImage: `url('${item.image}')` }}></div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/75 to-transparent"></div>
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">{item.type}</span>
          <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{item.zone}</span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
          <div>
            <div className="rating-stars text-sm leading-none">{renderStars(stats.average)}</div>
            <p className="mt-1 text-xs font-semibold text-slate-500">{item.ratingLabel || 'Muy recomendado'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold leading-none text-slate-900">{stats.average.toFixed(1)}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{stats.reviews} reseñas</p>
          </div>
        </div>
      </div>
      <GalleryStrip item={item} />
      <div className="p-6">
        <h3 className="text-2xl font-bold leading-tight text-slate-900">{item.name}</h3>
        {item.representative ? <p className="mt-2 text-sm text-slate-500">Representante: <span className="font-medium text-slate-700">{item.representative}</span></p> : null}
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p><span className="font-semibold text-slate-900">Teléfono:</span> {item.phone || 'No informado'}</p>
          <p className="mt-2 contact-link"><span className="font-semibold text-slate-900">Email:</span> {item.email || 'No informado'}</p>
          <p className="mt-2"><span className="font-semibold text-slate-900">Zona:</span> {item.zone}</p>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tarifa visible</p>
          <p className="mt-2 text-base font-bold text-slate-900">{feeText}</p>
        </div>
        <RatingPanel item={item} ratingVersion={ratingVersion} onRate={onRate} />
        {detailPath ? (
          <Link
            to={detailPath}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ver detalle
          </Link>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="card-hover overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-card">
      {cardContent}
    </article>
  );
}

export default DirectoryCard;
