import { buildCsv, csvFilename, downloadCsv } from '../utils/csv';

function DownloadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

/**
 * Botón "Exportar CSV" para las tablas del panel admin.
 *
 * @param {Object} props
 * @param {string} props.entity Nombre de la entidad para el archivo (`<entidad>-YYYY-MM-DD.csv`).
 * @param {any[]} props.rows Filas a exportar (normalmente las ya filtradas).
 * @param {{ header: string, value: (row: any) => unknown }[]} props.columns Columnas del CSV.
 * @param {string} [props.label]
 * @param {string} [props.className]
 */
export default function AdminExportButton({
  entity,
  rows,
  columns,
  label = 'Exportar CSV',
  className = ''
}) {
  const count = rows?.length ?? 0;
  const disabled = count === 0;

  const handleClick = () => {
    if (disabled) return;
    downloadCsv(buildCsv(rows, columns), csvFilename(entity));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={disabled ? 'No hay filas para exportar' : `Exportar ${count} fila${count === 1 ? '' : 's'} a CSV`}
      className={`admin-button-secondary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-forest-200 disabled:hover:bg-white ${className}`}
    >
      <DownloadIcon />
      {label}
    </button>
  );
}
