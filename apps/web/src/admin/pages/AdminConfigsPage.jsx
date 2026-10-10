import { useMemo, useState } from 'react';
import AdminIcon from '../components/AdminIcon';

const statusLabels = {
  created: 'Creado',
  updated: 'Actualizado',
  deactivated: 'Desactivado',
  unchanged: 'Sin cambios'
};

const statusStyles = {
  created: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  updated: 'bg-sky-50 text-sky-700 ring-sky-600/10',
  deactivated: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  unchanged: 'bg-forest-100 text-forest-500 ring-forest-600/10'
};

const typeLabels = {
  lodge: 'Lodge',
  guide: 'Guía'
};

function SyncStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        statusStyles[status] || statusStyles.unchanged
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-forest-100 bg-forest-50/50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-forest-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-forest-950">{value}</p>
    </div>
  );
}

export default function AdminConfigsPage({ onSyncProducts }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const visibleItems = useMemo(() => {
    if (!result) return [];
    return showUnchanged ? result.items : result.items.filter((item) => item.status !== 'unchanged');
  }, [result, showUnchanged]);

  const runSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      setResult(await onSyncProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sincronizar con BSale');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="admin-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="admin-eyebrow">BSale</p>
            <h2 className="mt-1 text-lg font-semibold text-forest-950">
              Sincronizar lodges y guías
            </h2>
            <p className="mt-2 text-sm text-forest-500">
              Trae todos los productos de los tipos Lodge y Guía desde BSale. Crea los que faltan y
              actualiza nombres y estado activo. Los productos que ya no están en BSale se
              desactivan (no se eliminan, porque tienen cotizaciones y reseñas asociadas).
            </p>
          </div>
          <button
            type="button"
            onClick={runSync}
            disabled={syncing}
            className="admin-button-primary shrink-0"
          >
            <AdminIcon name="sync" className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando…' : 'Sincronizar con BSale'}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryStat label="Creados" value={result.created} />
            <SummaryStat label="Actualizados" value={result.updated} />
            <SummaryStat label="Desactivados" value={result.deactivated} />
            <SummaryStat label="Sin cambios" value={result.unchanged} />
          </div>
        )}
      </section>

      {result && (
        <section className="admin-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-100 p-4">
            <p className="text-sm text-forest-500">
              Última sincronización:{' '}
              <strong className="text-forest-950">
                {new Date(result.syncedAt).toLocaleString('es-CL')}
              </strong>
            </p>
            <label className="flex items-center gap-2 text-sm text-forest-600">
              <input
                type="checkbox"
                checked={showUnchanged}
                onChange={(e) => setShowUnchanged(e.target.checked)}
              />
              Mostrar sin cambios
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-forest-50/70">
                <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-forest-400">
                  <th className="px-5 py-3.5">Producto</th>
                  <th className="px-5 py-3.5">Tipo</th>
                  <th className="px-5 py-3.5">Activo</th>
                  <th className="px-5 py-3.5">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {visibleItems.map((item) => (
                  <tr
                    key={`${item.catalogType}:${item.bsaleProductId}`}
                    className="hover:bg-ona-50/[0.45]"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-forest-950">{item.name}</p>
                      {item.previousName && item.previousName !== item.name && (
                        <p className="mt-1 text-xs text-forest-400 line-through">
                          {item.previousName}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-forest-400">BSale #{item.bsaleProductId}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-forest-600">
                      {typeLabels[item.catalogType] || item.catalogType}
                    </td>
                    <td className="px-5 py-4 text-sm text-forest-600">
                      {item.active ? 'Sí' : 'No'}
                      {item.previousActive != null && item.previousActive !== item.active && (
                        <span className="ml-1 text-xs text-forest-400">
                          (antes {item.previousActive ? 'sí' : 'no'})
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <SyncStatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
                {!visibleItems.length && (
                  <tr>
                    <td colSpan="4" className="px-5 py-14 text-center text-sm text-forest-400">
                      Todo está sincronizado. No hubo cambios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
