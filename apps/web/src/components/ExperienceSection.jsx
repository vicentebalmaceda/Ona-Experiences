import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CompactMap from './CompactMap.jsx';
import { formatRating, getRatingStats, renderStars, sortItemsByRating } from '../utils/rating.js';
import { inZone, zoneIds, zoneLabel } from '../utils/zones.js';
import { itemImageAlt } from '../utils/imageAlt.js';
import { responsiveImage } from '../utils/responsiveImage.js';

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Square thumbnail on the left, details stacked on the right.
function ExperienceListItem({ item, onSelect }) {
  const { t } = useTranslation();
  const stats = getRatingStats(item);

  return (
    <button type="button" onClick={() => onSelect(item)} className="experience-list-item group">
      <div className="experience-list-cover">
        <img {...responsiveImage(item.image, '128px')} width="128" height="128" loading="lazy" decoding="async" alt={itemImageAlt(item, t)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1 pr-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-extrabold leading-tight text-slate-950">{item.name}</h3>
          <div className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-xs font-extrabold text-white">
            {stats.average != null ? formatRating(stats.average) : t('rating.none_short')}
          </div>
        </div>
        <p className="truncate text-sm font-medium text-slate-500">{zoneLabel(item.zone, t)}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          {stats.reviews > 0 ? (
            <>
              <span className="rating-stars text-sm leading-none">{renderStars(stats.average)}</span>
              <span>{t('experience.reviews_count', { count: stats.reviews })}</span>
            </>
          ) : (
            <span>{t('rating.none')}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function ExperienceSection({ id, mapAnchorId, eyebrow, title, description, heroImage, heroAlt, items, ratingVersion, onSelect, emptyText }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('all');

  // Zone ids run north to south, so numeric order is geographic order.
  const zones = useMemo(() => {
    const ids = new Set(items.flatMap(item => zoneIds(item.zone)));
    return ['all', ...[...ids].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, i18n.language))];
  }, [items, i18n.language]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    return items.filter(item => {
      const zoneMatch = zone === 'all' || inZone(item.zone, zone);
      const textMatch = !normalizedQuery || normalizeText(`${item.name} ${zoneLabel(item.zone, t)} ${item.email} ${item.representative || ''}`).includes(normalizedQuery);
      return zoneMatch && textMatch;
    });
  }, [items, query, zone, t]);

  const sortedItems = useMemo(() => sortItemsByRating(filteredItems), [filteredItems]);

  const heroItem = filteredItems[0] || items[0];

  const listEmptyMessage = !items.length && emptyText
    ? emptyText
    : t('experience.no_filter_results');

  return (
    <section id={mapAnchorId || id} className="experience-screen scroll-mt-28 py-14 sm:py-16">
      <div id={id} className="mx-auto max-w-7xl scroll-mt-28 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl leading-tight text-slate-950 sm:text-5xl">{title}</h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        </div>

        <div className="experience-layout">
          <aside className="experience-photo-card">
            <img {...responsiveImage(heroImage || heroItem?.image, '(min-width: 1280px) 28vw, 100vw')} width="960" height="1200" loading="lazy" decoding="async" alt={heroAlt || title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent"></div>
            <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white">
              <span className="mb-4 w-fit rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">{t('experience.fly_fishing')}</span>
              <h3 className="font-display text-3xl leading-tight">{t('experience.photo_title')}</h3>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/12 p-4 backdrop-blur">
                  <p className="text-3xl font-extrabold">{items.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/75">{t('experience.options')}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/12 p-4 backdrop-blur">
                  <p className="text-3xl font-extrabold">{zones.length - 1}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/75">{t('experience.zones')}</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="experience-list-card">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-950">{eyebrow}</h3>
                </div>
                <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-black text-deep">{t('experience.visible', { count: sortedItems.length })}</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.8fr]">
                <label className="sr-only" htmlFor={`${id}-search`}>{t('experience.search')}</label>
                <input id={`${id}-search`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('experience.search_placeholder')} className="directory-input" />
                <label className="sr-only" htmlFor={`${id}-zone`}>{t('experience.zone')}</label>
                <select id={`${id}-zone`} value={zone} onChange={(event) => setZone(event.target.value)} className="directory-input">
                  {zones.map(itemZone => <option key={itemZone} value={itemZone}>{itemZone === 'all' ? t('experience.all_zones') : zoneLabel(itemZone, t)}</option>)}
                </select>
              </div>
            </div>

            <div className="experience-list-scroll">
              {sortedItems.length ? sortedItems.map(item => (
                <ExperienceListItem
                  key={item.productId ?? `${item.type}-${item.name}`}
                  item={item}
                  onSelect={onSelect}
                />
              )) : (
                <div className="m-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  {listEmptyMessage}
                </div>
              )}
            </div>
          </section>

          <aside className="experience-map-card">
            <div className="map-panel-header">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{t('experience.map_label')}</p>
                <h3 className="text-lg font-bold text-white">{t('experience.map_title', { eyebrow: eyebrow.toLowerCase() })}</h3>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">{t('experience.map_points', { count: sortedItems.length })}</div>
            </div>
            <CompactMap items={sortedItems} ratingVersion={ratingVersion} onSelect={onSelect} ariaLabel={t('experience.map_aria', { eyebrow })} />
            <div className="map-panel-footer">
              <span className="inline-flex items-center gap-2"><span className="marker-dot marker-dot-lodge"></span>{t('experience.lodges_legend')}</span>
              <span className="inline-flex items-center gap-2"><span className="marker-dot marker-dot-guide"></span>{t('experience.guides_legend')}</span>
              <span className="ml-auto hidden text-slate-500 md:inline">{t('experience.map_click_hint')}</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default ExperienceSection;
