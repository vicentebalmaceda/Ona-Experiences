export default function AdminBrand({ compact = false, framed = false }) {
  return (
    <div className={framed ? 'inline-flex rounded-2xl bg-white p-2.5 shadow-sm' : 'inline-flex'}>
      <img
        src="/assets/ona-experience.png"
        alt="Ona Experience"
        width={1220}
        height={222}
        className={`${compact ? 'w-[190px]' : 'w-[260px]'} h-auto max-w-full object-contain`}
      />
    </div>
  );
}
