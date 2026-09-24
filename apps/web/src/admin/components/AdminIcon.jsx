const paths = {
  quotes: 'M4 4h16v4H4V4Zm0 6h16v10H4V10Zm3 3h4v4H7v-4Z',
  mail: 'M3 5h18v14H3V5Zm1.5 1.5L12 12l7.5-5.5',
  star: 'm12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 2.8Z',
  search: 'm21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  logout: 'M10 17l5-5-5-5m5 5H3m10-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18'
};

export default function AdminIcon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={name === 'star' || name === 'quotes' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={paths[name] || paths.quotes} />
    </svg>
  );
}
