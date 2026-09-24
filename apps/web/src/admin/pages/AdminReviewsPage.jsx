import { useMemo, useState } from 'react';
import AdminIcon from '../components/AdminIcon';

export default function AdminReviewsPage({ reviews, onToggleVisibility }) {
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return reviews.filter((review) =>
      `${review.displayName} ${review.productName} ${review.comment}`.toLowerCase().includes(normalized)
    );
  }, [reviews, query]);

  const toggle = async (review) => {
    setBusyId(review.id);
    try {
      await onToggleVisibility(review.id, review.visible);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="admin-surface overflow-hidden">
        <div className="border-b border-forest-100 p-4">
          <label className="relative block max-w-xl">
            <AdminIcon
              name="search"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400"
            />
            <input
              className="admin-field-control !pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar reseñas"
            />
          </label>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((review) => (
            <article
              key={review.id}
              className="rounded-[24px] border border-forest-100 bg-[#fcfbf8] p-5 transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-ona-700">
                    <AdminIcon name="star" className="h-4 w-4" />
                    <span className="text-sm font-bold">{Number(review.rating).toFixed(1)}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-forest-950">{review.displayName}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === review.id}
                  onClick={() => toggle(review)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    review.visible
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-forest-100 text-forest-500'
                  }`}
                >
                  {review.visible ? 'Visible' : 'Oculta'}
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-forest-700">“{review.comment}”</p>
              <div className="mt-5 border-t border-forest-100 pt-4">
                <p className="text-xs font-medium text-forest-700">{review.productName}</p>
                <p className="mt-1 text-[11px] text-forest-400">
                  {review.catalogType || 'producto'} ·{' '}
                  {new Date(review.createdAt).toLocaleDateString('es-CL')}
                </p>
              </div>
            </article>
          ))}
          {!filtered.length && (
            <p className="col-span-full py-10 text-center text-sm text-forest-400">
              No hay reseñas para mostrar.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
