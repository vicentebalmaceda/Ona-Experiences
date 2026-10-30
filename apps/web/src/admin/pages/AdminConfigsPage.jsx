import { useEffect, useMemo, useRef, useState } from 'react';
import { validateMailRecipients } from '../../../shared/siteSettings.ts';
import AdminEmailListInput from '../components/AdminEmailListInput';
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


function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-CL');
}

function sameList(a, b) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * "Republicar sitio": the public pages are static HTML generated at build
 * time. BSale, Sitio and review changes already trigger a rebuild; this is
 * the manual escape hatch.
 */
function SiteRebuildSection({ onRebuildSite }) {
  const [state, setState] = useState({ status: 'idle', message: null });

  const run = async () => {
    setState({ status: 'running', message: null });
    try {
      const result = await onRebuildSite();
      if (result?.triggered) {
        setState({
          status: 'done',
          message: 'Listo: el sitio se está regenerando. Los cambios se verán en unos minutos.'
        });
      } else if (result?.skipped === 'unconfigured') {
        setState({
          status: 'error',
          message: 'Falta configurar VERCEL_DEPLOY_HOOK_URL en Vercel; no se pudo republicar.'
        });
      } else {
        setState({ status: 'done', message: 'Ya hay una republicación en curso.' });
      }
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'No se pudo republicar el sitio'
      });
    }
  };

  return (
    <section className="admin-surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="admin-eyebrow">Sitio público</p>
          <h2 className="mt-1 text-lg font-semibold text-forest-950">Republicar sitio</h2>
          <p className="mt-2 text-sm text-forest-500">
            Las páginas públicas se generan como HTML estático. Se regeneran solas cuando cambia un
            producto en BSale, una imagen de Sitio o una reseña, y una vez al día. Usa este botón si
            un cambio todavía no aparece después de unos minutos.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={state.status === 'running'}
          className="admin-button-primary shrink-0"
        >
          <AdminIcon name="sync" className={`h-4 w-4 ${state.status === 'running' ? 'animate-spin' : ''}`} />
          {state.status === 'running' ? 'Republicando…' : 'Republicar sitio'}
        </button>
      </div>
      {state.message && (
        <p
          role="status"
          className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
            state.status === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {state.message}
        </p>
      )}
    </section>
  );
}

const STORE_NOTICE =
  'La tabla site_settings todavía no existe en la base de datos. Ejecuta el bloque site_settings de schema.sql para poder guardar; mientras tanto se usa ADMIN_EMAIL.';

function MailSettingCard({ item, canSave, onSave, onReset, onTest }) {
  const [to, setTo] = useState(item.value.to);
  const [cc, setCc] = useState(item.value.cc);
  const [busy, setBusy] = useState(null); // 'saving' | 'testing' | 'resetting' | null
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const feedbackTimer = useRef(null);

  // Resync the form when the server value changes (after save/reset/reload).
  useEffect(() => {
    setTo(item.value.to);
    setCc(item.value.cc);
  }, [item.value.to, item.value.cc]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const dirty = !sameList(to, item.value.to) || !sameList(cc, item.value.cc);

  const flash = (message) => {
    setFeedback(message);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(''), 2800);
  };

  const run = async (kind, action, successMessage) => {
    const check = validateMailRecipients({ to, cc });
    if (kind !== 'resetting' && !check.ok) {
      setError(check.reason);
      return;
    }
    setBusy(kind);
    setError('');
    setFeedback('');
    try {
      await action(check.value);
      flash(successMessage);
    } catch (err) {
      setError(err?.data?.error || err?.message || 'No se pudo completar la acción.');
    } finally {
      setBusy(null);
    }
  };

  const save = () => run('saving', (value) => onSave(item.key, value), 'Destinatarios guardados.');
  const test = () =>
    run(
      'testing',
      (value) => onTest(item.key, value),
      `Correo de prueba enviado a ${to.join(', ')}${cc.length ? ` (cc: ${cc.join(', ')})` : ''}.`
    );
  const reset = () => {
    const ok = window.confirm(
      `¿Volver al destinatario por defecto (ADMIN_EMAIL) para "${item.label}"? Se borrarán las listas guardadas.`
    );
    if (!ok) return;
    run('resetting', () => onReset(item.key), 'Restaurado al valor por defecto.');
  };

  return (
    <article className="rounded-2xl border border-forest-100 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-forest-950">{item.label}</h3>
          <p className="mt-1 text-sm text-forest-500">{item.description}</p>
        </div>
        {item.source === 'env' ? (
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/10">
            Por defecto (ADMIN_EMAIL)
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
            Personalizado
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminEmailListInput
          id={`${item.key}-to`}
          label="Para"
          value={to}
          onChange={setTo}
          disabled={Boolean(busy)}
          hint="Al menos una dirección. Enter o coma para agregar."
        />
        <AdminEmailListInput
          id={`${item.key}-cc`}
          label="CC"
          value={cc}
          onChange={setCc}
          disabled={Boolean(busy)}
          hint="Opcional. Reciben copia visible."
        />
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
      {feedback && (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {feedback}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={Boolean(busy) || !dirty || !canSave}
          className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-50"
          title={canSave ? undefined : STORE_NOTICE}
        >
          {busy === 'saving' ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={test}
          disabled={Boolean(busy) || to.length === 0}
          className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
          title="Envía un correo de ejemplo de este flujo a las direcciones indicadas (sin guardar)"
        >
          {busy === 'testing' ? 'Enviando…' : 'Enviar prueba'}
        </button>
        {item.source === 'db' && (
          <button
            type="button"
            onClick={reset}
            disabled={Boolean(busy)}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-forest-500 hover:bg-forest-100 disabled:opacity-50"
          >
            {busy === 'resetting' ? 'Restaurando…' : 'Restaurar por defecto'}
          </button>
        )}
        {item.updatedBy && (
          <span className="ml-auto text-xs text-forest-400">
            Actualizado por {item.updatedBy} el {formatDate(item.updatedAt)}
          </span>
        )}
      </div>
    </article>
  );
}

function MailSettingsSection({ settings, loading, error, onReload, onSave, onReset, onTest }) {
  const items = settings?.items ?? null;
  const storeAvailable = settings ? settings.storeAvailable !== false : true;
  return (
    <section className="admin-surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="admin-eyebrow">Correos</p>
          <h2 className="mt-1 text-lg font-semibold text-forest-950">Destinatarios de las notificaciones</h2>
          <p className="mt-2 text-sm text-forest-500">
            Quién recibe cada correo interno del servicio. Los correos a clientes (invitación y
            agradecimiento de reseña) van siempre al cliente y no se configuran aquí. "Enviar
            prueba" manda un ejemplo real del correo a las direcciones indicadas sin guardarlas.
          </p>
        </div>
        <button type="button" onClick={onReload} disabled={loading} className="admin-button-secondary shrink-0">
          <AdminIcon name="sync" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      )}
      {!storeAvailable && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {STORE_NOTICE}
        </p>
      )}

      <div className="mt-5 space-y-4">
        {!items && !error && <p className="text-sm text-forest-400">Cargando destinatarios…</p>}
        {items?.map((item) => (
          <MailSettingCard
            key={item.key}
            item={item}
            canSave={storeAvailable}
            onSave={onSave}
            onReset={onReset}
            onTest={onTest}
          />
        ))}
      </div>
    </section>
  );
}

export default function AdminConfigsPage({
  onSyncProducts,
  onRebuildSite,
  mailSettings,
  mailSettingsLoading,
  mailSettingsError,
  onReloadMailSettings,
  onSaveMailSetting,
  onResetMailSetting,
  onTestMailSetting
}) {
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
      <MailSettingsSection
        settings={mailSettings}
        loading={mailSettingsLoading}
        error={mailSettingsError}
        onReload={onReloadMailSettings}
        onSave={onSaveMailSetting}
        onReset={onResetMailSetting}
        onTest={onTestMailSetting}
      />

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

      {onRebuildSite && <SiteRebuildSection onRebuildSite={onRebuildSite} />}
    </div>
  );
}
