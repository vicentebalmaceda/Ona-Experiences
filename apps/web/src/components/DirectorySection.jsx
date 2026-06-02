import DirectoryCard from './DirectoryCard.jsx';

function DirectorySection({ id, eyebrow, title, description, items, emptyText, ratingVersion, onRate }) {
  return (
    <section id={id} className="pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-deep">{eyebrow}</p><h2 className="mt-2 font-display text-4xl text-slate-900">{title}</h2></div>
          <p className="max-w-2xl text-slate-600">{description}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.length ? items.map(item => <DirectoryCard key={`${item.type}-${item.name}`} item={item} ratingVersion={ratingVersion} onRate={onRate} />) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-slate-500 md:col-span-2 xl:col-span-3">{emptyText}</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default DirectorySection;
