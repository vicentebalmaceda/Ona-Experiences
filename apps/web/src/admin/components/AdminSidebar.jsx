import AdminBrand from './AdminBrand';
import AdminIcon from './AdminIcon';

const items = [
  { id: 'summary', label: 'Resumen', icon: 'summary' },
  { id: 'quotes', label: 'Cotizaciones', icon: 'quotes' },
  { id: 'invites', label: 'Invitaciones', icon: 'mail' },
  { id: 'reviews', label: 'Reseñas', icon: 'star' }
];

export default function AdminSidebar({ page, setPage, open, onClose, onLogout, email }) {
  return (
    <>
      {open && (
        <button
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[282px] flex-col bg-forest-950 px-5 py-6 text-white transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <AdminBrand compact framed />
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <AdminIcon name="close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-10 space-y-1.5">
          {items.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPage(item.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? 'bg-white text-forest-950 shadow-soft'
                    : 'text-white/[0.65] hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <AdminIcon name={item.icon} className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ona-400" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{email || 'Ona Admin'}</p>
              <p className="mt-1 text-[11px] text-white/40">Administrador</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl p-2.5 text-white/[0.55] transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <AdminIcon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
