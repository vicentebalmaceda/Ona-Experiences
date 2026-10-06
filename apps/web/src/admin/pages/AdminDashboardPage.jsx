import { useMemo } from 'react';
import AdminIcon from '../components/AdminIcon';
import { RECENT_WINDOW_DAYS, summarizeAdminData } from '../utils/summary';

const numberFormat = new Intl.NumberFormat('es-CL');

function formatCount(value) {
  return numberFormat.format(value || 0);
}

function formatRating(value) {
  return value == null ? '—' : value.toFixed(1).replace('.', ',');
}

function StatCard({ icon, eyebrow, total, caption, rows, onOpen, openLabel }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={openLabel}
      className="admin-surface group flex w-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-4 focus:ring-ona-100 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ona-100 text-ona-800">
            <AdminIcon name={icon} className="h-4 w-4" />
          </span>
          <p className="admin-eyebrow">{eyebrow}</p>
        </div>
        <AdminIcon
          name="arrow"
          className="h-4 w-4 text-forest-300 transition group-hover:translate-x-0.5 group-hover:text-forest-700"
        />
      </div>

      <p className="mt-5 font-adminDisplay text-5xl font-semibold tracking-tight text-forest-950">
        {formatCount(total)}
      </p>
      <p className="mt-1.5 min-h-[18px] text-xs text-forest-400">{caption}</p>

      <dl className="mt-5 space-y-2 border-t border-forest-100 pt-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-forest-600">
              {row.dot && <span className={`h-2 w-2 rounded-full ${row.dot}`} />}
              {row.label}
            </dt>
            <dd className="font-semibold text-forest-950">{row.value}</dd>
          </div>
        ))}
      </dl>
    </button>
  );
}

export default function AdminDashboardPage({ quotes, invites, reviews, setPage }) {
  const summary = useMemo(
    () => summarizeAdminData({ quotes, invites, reviews }),
    [quotes, invites, reviews]
  );

  const recentCaption = (count) =>
    count == null ? '' : `${formatCount(count)} en los últimos ${RECENT_WINDOW_DAYS} días`;

  return (
    <div className="space-y-5">
      <p className="text-sm text-forest-500">
        Estado general de cotizaciones, invitaciones y reseñas. Toca una tarjeta para ir al detalle.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <StatCard
          icon="quotes"
          eyebrow="Cotizaciones"
          total={summary.quotes.total}
          caption={recentCaption(summary.quotes.recent)}
          onOpen={() => setPage('quotes')}
          openLabel="Ver cotizaciones"
          rows={[
            { label: 'Sin invitación', value: formatCount(summary.quotes.byStatus.none), dot: 'bg-amber-400' },
            { label: 'Invitación abierta', value: formatCount(summary.quotes.byStatus.open), dot: 'bg-sky-400' },
            { label: 'Con reseña', value: formatCount(summary.quotes.byStatus.reviewed), dot: 'bg-emerald-500' },
            { label: 'Invitación expirada', value: formatCount(summary.quotes.byStatus.expired), dot: 'bg-rose-400' }
          ]}
        />

        <StatCard
          icon="mail"
          eyebrow="Invitaciones"
          total={summary.invites.total}
          caption={recentCaption(summary.invites.recent)}
          onOpen={() => setPage('invites')}
          openLabel="Ver invitaciones"
          rows={[
            { label: 'Abiertas', value: formatCount(summary.invites.byStatus.open), dot: 'bg-sky-400' },
            { label: 'Usadas', value: formatCount(summary.invites.byStatus.used), dot: 'bg-emerald-500' },
            { label: 'Expiradas', value: formatCount(summary.invites.byStatus.expired), dot: 'bg-rose-400' },
            { label: 'Revocadas', value: formatCount(summary.invites.byStatus.revoked), dot: 'bg-forest-300' }
          ]}
        />

        <StatCard
          icon="star"
          eyebrow="Reseñas"
          total={summary.reviews.total}
          caption={recentCaption(summary.reviews.recent)}
          onOpen={() => setPage('reviews')}
          openLabel="Ver reseñas"
          rows={[
            { label: 'Visibles', value: formatCount(summary.reviews.visible), dot: 'bg-emerald-500' },
            { label: 'Ocultas', value: formatCount(summary.reviews.hidden), dot: 'bg-forest-300' },
            { label: 'Promedio público (visibles)', value: `${formatRating(summary.reviews.visibleAverageRating)} ★` },
            { label: 'Promedio general', value: `${formatRating(summary.reviews.averageRating)} ★` }
          ]}
        />
      </div>
    </div>
  );
}
