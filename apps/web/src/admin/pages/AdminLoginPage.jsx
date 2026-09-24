import { useState } from 'react';
import AdminBrand from '../components/AdminBrand';
import AdminIcon from '../components/AdminIcon';

export default function AdminLoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin({ email, password });
    } catch {
      setError('No fue posible iniciar sesión. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f0e7] p-3 sm:p-5 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1480px] overflow-hidden rounded-[28px] bg-white shadow-card sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden bg-forest-950 p-10 text-white lg:flex lg:flex-col">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                'radial-gradient(circle at 18% 18%, rgba(211,165,71,.18), transparent 30%), radial-gradient(circle at 82% 72%, rgba(255,255,255,.06), transparent 28%)'
            }}
          />
          <div className="relative z-10">
            <AdminBrand framed />
          </div>
          <div className="relative z-10 my-auto">
            <h1 className="max-w-xl font-adminDisplay text-5xl font-semibold leading-tight tracking-tight xl:text-6xl">
              Admin Ona Experiences
            </h1>
          </div>
          <div className="relative z-10 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-white/40">
            <span className="h-px w-10 bg-ona-400/60" />
            Patagonia · Chile
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="mb-12 lg:hidden">
              <AdminBrand />
            </div>
            <h2 className="font-adminDisplay text-4xl font-semibold tracking-tight text-forest-950">
              Iniciar sesión
            </h2>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block">
                <span className="admin-field-label">Correo electrónico</span>
                <input
                  type="email"
                  className="admin-field-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block">
                <span className="admin-field-label">Contraseña</span>
                <input
                  type="password"
                  className="admin-field-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              {error && (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
              )}
              <button type="submit" className="admin-button-primary w-full" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
                {!loading && <AdminIcon name="arrow" className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
