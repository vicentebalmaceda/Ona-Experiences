const styles = {
  open: 'bg-sky-50 text-sky-700 ring-sky-600/10',
  used: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  reviewed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  expired: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  revoked: 'bg-forest-100 text-forest-500 ring-forest-600/10',
  none: 'bg-amber-50 text-amber-700 ring-amber-600/10'
};

const labels = {
  open: 'Abierta',
  used: 'Respondida',
  reviewed: 'Con reseña',
  expired: 'Expirada',
  revoked: 'Revocada',
  none: 'Sin invitación'
};

export default function AdminStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] || 'bg-slate-50 text-slate-700 ring-slate-600/10'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
