import { useMemo, useState } from 'react';
import AdminIcon from '../components/AdminIcon';
import AdminStatusBadge from '../components/AdminStatusBadge';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CL');
}

export default function AdminInvitesPage({ invites }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(() => {
    return invites.filter((item) => {
      const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.productName} ${item.bsaleDocumentId}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return haystack && (status === 'all' || item.status === status);
    });
  }, [invites, query, status]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-forest-500">
        <strong className="text-forest-950">{filtered.length}</strong> invitaciones
      </p>

      <section className="admin-surface overflow-hidden">
        <div className="grid gap-3 border-b border-forest-100 p-4 lg:grid-cols-[1fr_180px]">
          <label className="relative block">
            <AdminIcon
              name="search"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400"
            />
            <input
              className="admin-field-control !pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente, correo o producto"
            />
          </label>
          <select
            className="admin-field-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="open">Abierta</option>
            <option value="used">Respondida</option>
            <option value="expired">Expirada</option>
            <option value="revoked">Revocada</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-forest-50/70">
              <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-forest-400">
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Producto</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Vigencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-ona-50/[0.45]">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-forest-950">
                      {item.firstName} {item.lastName}
                    </p>
                    <p className="mt-1 text-xs text-forest-400">{item.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-forest-800">{item.productName}</p>
                    <p className="mt-1 text-xs text-forest-400">
                      Doc #{item.bsaleDocumentId ?? '—'}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4 text-sm text-forest-600">{formatDate(item.expiresAt)}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="4" className="px-5 py-14 text-center text-sm text-forest-400">
                    No hay invitaciones para estos filtros.
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
