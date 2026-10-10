import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  SITE_ASSET_SLOTS,
  SLOT_RULES,
  buildBlobPathname,
  checkFileForSlot,
  formatMegabytes
} from '../../../shared/siteAssetSlots.ts';
import AdminIcon from '../components/AdminIcon';
import { describeMedia } from '../utils/mediaProbe';
import {
  formatDimensions,
  formatDuration,
  formatPublishedAt,
  needsPosterHint,
  warningsForMedia
} from '../utils/siteAssetHints';

const BLOB_NOTICE = 'Almacenamiento de archivos no configurado (falta BLOB_READ_WRITE_TOKEN).';

function MediaPreview({ kind, url, alt, poster, className }) {
  if (kind === 'video') {
    return (
      <video
        key={url}
        src={url}
        poster={poster || undefined}
        muted
        autoPlay
        loop
        playsInline
        className={className}
      />
    );
  }
  return <img key={url} src={url} alt={alt || ''} className={className} />;
}

function Notice({ tone = 'info', children }) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800'
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${tones[tone] || tones.info}`}>
      {children}
    </div>
  );
}

function SlotCard({ slot, asset, posterUrl, showPosterHint, uploadsEnabled, onPublish, onRestore }) {
  const rules = SLOT_RULES[slot];
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [alt, setAlt] = useState(asset?.alt || '');
  const [probing, setProbing] = useState(false);
  const [busy, setBusy] = useState(null); // 'uploading' | 'publishing' | 'restoring' | null
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setAlt(asset?.alt || '');
  }, [asset?.alt]);

  // Object URL for the local preview, revoked whenever the file changes or the card unmounts.
  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isPublished = Boolean(asset);
  const currentKind = asset?.kind || rules.defaultKind;
  const currentUrl = asset?.url || rules.defaultUrl;
  const warnings = media ? warningsForMedia(slot, media) : [];
  const showAlt = (media?.kind || (file ? null : currentKind)) !== 'video';

  const clearSelection = () => {
    setFile(null);
    setMedia(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onPick = async (event) => {
    const picked = event.target.files?.[0];
    setError('');
    setFeedback('');
    if (!picked) {
      clearSelection();
      return;
    }
    const check = checkFileForSlot(slot, picked.type, picked.size);
    if (!check.ok) {
      clearSelection();
      setError(check.reason || 'El archivo no es válido para este espacio.');
      return;
    }
    setProbing(true);
    try {
      const info = await describeMedia(picked);
      setFile(picked);
      setMedia(info);
    } catch (err) {
      clearSelection();
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    } finally {
      setProbing(false);
    }
  };

  const publish = async () => {
    if (!file) return;
    setError('');
    setFeedback('');
    setProgress(0);
    setBusy('uploading');
    try {
      const uploaded = await upload(buildBlobPathname(slot, file.name), file, {
        access: 'public',
        handleUploadUrl: '/api/v1/admin/assets/upload-token',
        clientPayload: JSON.stringify({ slot }),
        contentType: file.type,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage))
      });
      setBusy('publishing');
      const body = { pathname: uploaded.pathname };
      if (media?.kind !== 'video' && alt.trim()) body.alt = alt.trim();
      if (media?.width) body.width = media.width;
      if (media?.height) body.height = media.height;
      await onPublish(slot, body);
      clearSelection();
      setFeedback(`${rules.label} publicado.`);
      setTimeout(() => setFeedback(''), 2800);
    } catch (err) {
      setError(err?.data?.error || err?.message || 'No se pudo publicar el archivo.');
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    const ok = window.confirm(
      `¿Restaurar el valor por defecto de "${rules.label}"? El archivo publicado se eliminará.`
    );
    if (!ok) return;
    setError('');
    setFeedback('');
    setBusy('restoring');
    try {
      await onRestore(slot);
      clearSelection();
      setFeedback(`${rules.label} restaurado al valor por defecto.`);
      setTimeout(() => setFeedback(''), 2800);
    } catch (err) {
      setError(err?.data?.error || err?.message || 'No se pudo restaurar el valor por defecto.');
    } finally {
      setBusy(null);
    }
  };

  const isBusy = busy !== null;
  const busyLabel =
    busy === 'uploading'
      ? `Subiendo… ${progress}%`
      : busy === 'publishing'
        ? 'Publicando…'
        : busy === 'restoring'
          ? 'Restaurando…'
          : null;

  return (
    <section className="admin-surface p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="admin-eyebrow">{rules.label}</p>
              <p className="mt-2 text-sm text-forest-600">{rules.description}</p>
              {slot === 'hero_poster' && (
                <p className="mt-1 text-xs text-forest-400">
                  Solo se usa cuando el hero es un video.
                </p>
              )}
            </div>
            {!isPublished && (
              <span className="shrink-0 rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-500">
                Por defecto
              </span>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-forest-100 bg-forest-50/60">
            <MediaPreview
              kind={currentKind}
              url={currentUrl}
              alt={asset?.alt}
              poster={currentKind === 'video' ? posterUrl : undefined}
              className={
                slot === 'logo'
                  ? 'mx-auto h-40 w-40 object-contain p-4'
                  : 'aspect-video w-full object-cover'
              }
            />
          </div>

          <p className="mt-3 text-xs text-forest-400">
            {isPublished
              ? `Publicado por ${asset.publishedBy} el ${formatPublishedAt(asset.publishedAt)}${
                  asset.width && asset.height ? ` · ${formatDimensions(asset.width, asset.height)}` : ''
                } · ${formatMegabytes(asset.sizeBytes)}`
              : 'Se está mostrando el archivo por defecto del sitio.'}
          </p>

          {showPosterHint && (
            <div className="mt-3">
              <Notice tone="warning">
                El hero es un video y no hay poster publicado. Se recomienda subir uno en la
                tarjeta «Poster del video» para que la portada no quede en blanco mientras carga.
              </Notice>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="admin-field-label" htmlFor={`asset-file-${slot}`}>
              Nuevo archivo
            </label>
            <input
              id={`asset-file-${slot}`}
              ref={inputRef}
              type="file"
              accept={rules.allowedContentTypes.join(',')}
              onChange={onPick}
              disabled={!uploadsEnabled || isBusy || probing}
              className="block w-full text-sm text-forest-600 file:mr-3 file:rounded-xl file:border-0 file:bg-forest-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-forest-900 hover:file:bg-forest-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-forest-400">{rules.recommended}</p>
          </div>

          {probing && <p className="text-xs text-forest-400">Leyendo el archivo…</p>}

          {file && media && (
            <div className="rounded-2xl border border-forest-100 bg-forest-50/50 p-3">
              <div className="overflow-hidden rounded-xl bg-white">
                <MediaPreview
                  kind={media.kind}
                  url={previewUrl}
                  alt={alt}
                  className={
                    slot === 'logo'
                      ? 'mx-auto h-32 w-32 object-contain p-3'
                      : 'aspect-video w-full object-cover'
                  }
                />
              </div>
              <p className="mt-2 truncate text-xs font-semibold text-forest-800" title={file.name}>
                {file.name}
              </p>
              <p className="mt-1 text-xs text-forest-500">
                {formatMegabytes(file.size)}
                {media.width && media.height ? ` · ${formatDimensions(media.width, media.height)} px` : ''}
                {media.kind === 'video' && media.durationSeconds != null
                  ? ` · ${formatDuration(media.durationSeconds)}`
                  : ''}
              </p>
              {warnings.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {warnings.map((warning) => (
                    <li key={warning} className="text-xs font-medium text-amber-700">
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showAlt && (
            <div>
              <label className="admin-field-label" htmlFor={`asset-alt-${slot}`}>
                Texto alternativo
              </label>
              <input
                id={`asset-alt-${slot}`}
                type="text"
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                disabled={isBusy}
                maxLength={200}
                placeholder="Describe la imagen para lectores de pantalla"
                className="admin-field-control"
              />
            </div>
          )}

          {busy === 'uploading' && (
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-forest-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-ona-500 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {feedback && <Notice tone="success">{feedback}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}

          <div className="mt-auto flex flex-wrap gap-3">
            <button
              type="button"
              onClick={publish}
              disabled={!uploadsEnabled || !file || isBusy || probing}
              className="admin-button-primary"
            >
              {busy === 'uploading' || busy === 'publishing' ? busyLabel : 'Publicar'}
            </button>
            {file && !isBusy && (
              <button type="button" onClick={clearSelection} className="admin-button-secondary">
                Cancelar
              </button>
            )}
            {isPublished && (
              <button
                type="button"
                onClick={restore}
                disabled={isBusy}
                className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === 'restoring' ? busyLabel : 'Restaurar por defecto'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdminSiteAssetsPage({ assets, loading, error, onReload, onPublish, onRestore }) {
  const items = assets?.items || {};
  const blobConfigured = assets ? assets.blobConfigured !== false : false;
  const posterHint = needsPosterHint(items);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-forest-500">
          Imágenes y video que se muestran en el sitio público. Cada cambio se publica al instante;
          el sitio puede tardar hasta un minuto en reflejarlo.
        </p>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="admin-button-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <AdminIcon name="sync" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {assets && !blobConfigured && <Notice tone="warning">{BLOB_NOTICE}</Notice>}

      {!assets && loading && (
        <section className="admin-surface p-10 text-center text-sm text-forest-400">
          Cargando archivos del sitio…
        </section>
      )}

      {assets &&
        SITE_ASSET_SLOTS.map((slot) => (
          <SlotCard
            key={slot}
            slot={slot}
            asset={items[slot] || null}
            posterUrl={slot === 'hero' ? items.hero_poster?.url : undefined}
            showPosterHint={slot === 'hero' && posterHint}
            uploadsEnabled={blobConfigured}
            onPublish={onPublish}
            onRestore={onRestore}
          />
        ))}
    </div>
  );
}
