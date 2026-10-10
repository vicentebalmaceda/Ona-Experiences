import AdminIcon from './AdminIcon';

const pageTitles = {
  summary: 'Resumen',
  quotes: 'Cotizaciones',
  invites: 'Invitaciones',
  reviews: 'Reseñas',
  site: 'Sitio',
  configs: 'Configuración'
};

export default function AdminTopbar({ page, onMenu, email }) {
  const title = pageTitles[page] || pageTitles.summary;
  const initials = (email || 'A')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-4 pb-7">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-xl border border-forest-200 bg-white p-2 text-forest-800 shadow-sm lg:hidden"
          aria-label="Abrir menú"
        >
          <AdminIcon name="menu" className="h-5 w-5" />
        </button>
        <div>
          <p className="admin-eyebrow">Admin Ona Experiences</p>
          <h1 className="mt-1 font-adminDisplay text-3xl font-semibold tracking-tight text-forest-950 sm:text-4xl">
            {title}
          </h1>
        </div>
      </div>

      <div className="hidden items-center gap-3 rounded-2xl border border-forest-200 bg-white px-3 py-2 shadow-sm sm:flex">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-ona-100 text-sm font-bold text-ona-800">
          {initials}
        </div>
        <div className="pr-2">
          <p className="text-xs font-semibold text-forest-950">{email}</p>
          <p className="mt-0.5 text-[11px] text-forest-400">Administrador</p>
        </div>
      </div>
    </header>
  );
}
