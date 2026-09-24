import { useMemo, useState } from 'react';
import AdminIcon from '../components/AdminIcon';
import AdminStatusBadge from '../components/AdminStatusBadge';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CL');
}

export default function AdminQuotesPage({ quotes, onSend, onResend }) {
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return quotes.filter((item) =>
      `${item.firstName} ${item.lastName} ${item.email} ${item.productName} ${item.bsaleDocumentId}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [quotes, query]);

  const run = async (bsaleDocumentId, action) => {
    setBusyId(bsaleDocumentId);
    setError('');
    setFeedback('');
    try {
      await action(bsaleDocumentId);
      setFeedback(`Cotización #${bsaleDocumentId} actualizada.`);
      setTimeout(() => setFeedback(''), 2800);
    } catch (err) {
      setError(err?.data?.error || err.message || 'No se pudo enviar la invitación.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-forest-500">
        <strong className="text-forest-950">{filtered.length}</strong> cotizaciones
      </p>
      {feedback && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

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
              placeholder="Buscar por cliente, correo, producto o documento"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-forest-50/70">
              <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-forest-400">
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Producto</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Creada</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {filtered.map((item) => (
                <tr key={item.quoteId} className="group hover:bg-ona-50/[0.45]">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-forest-950">
                      {item.firstName} {item.lastName}
                    </p>
                    <p className="mt-1 text-xs text-forest-400">{item.email}</p>
                  </td>
                  <td className="max-w-[320px] px-5 py-4">
                    <p className="text-sm font-medium text-forest-800">{item.productName}</p>
                    <p className="mt-1 text-xs text-forest-400">
                      Doc #{item.bsaleDocumentId} · {item.catalogType}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge status={item.inviteStatus} />
                  </td>
                  <td className="px-5 py-4 text-sm text-forest-600">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    {item.canSend && (
                      <button
                        type="button"
                        disabled={busyId === item.bsaleDocumentId}
                        onClick={() => run(item.bsaleDocumentId, onSend)}
                        className="rounded-xl px-3 py-2 text-xs font-semibold text-forest-950 hover:bg-forest-100"
                      >
                        Enviar
                      </button>
                    )}
                    {item.canResend && (
                      <button
                        type="button"
                        disabled={busyId === item.bsaleDocumentId}
                        onClick={() => run(item.bsaleDocumentId, onResend)}
                        className="rounded-xl px-3 py-2 text-xs font-semibold text-ona-700 hover:bg-ona-100"
                      >
                        Reenviar
                      </button>
                    )}
                    {!item.canSend && !item.canResend && !item.hasReview && (
                      <span className="text-xs font-medium text-forest-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="5" className="px-5 py-14 text-center text-sm text-forest-400">
                    No hay cotizaciones para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
