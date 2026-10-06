/**
 * Utilidades puras para exportar tablas del panel admin a CSV.
 *
 * Convenciones:
 * - Separador `;` (Excel en configuración regional chilena usa `;` como separador de lista;
 *   Google Sheets lo detecta automáticamente).
 * - Comillas según RFC 4180: se entrecomillan los campos que contienen el separador,
 *   comillas o saltos de línea; las comillas internas se duplican.
 * - Fin de línea CRLF.
 * - Fechas como dd-mm-yyyy (hora local del navegador), igual que las tablas del panel.
 * - Booleanos como "Sí" / "No"; null / undefined como celda vacía.
 * - El archivo se genera en UTF-8 con BOM para que Excel abra bien los acentos.
 */

export const CSV_SEPARATOR = ';';
export const CSV_LINE_BREAK = '\r\n';
export const CSV_BOM = '﻿';

/**
 * Convierte un valor (ISO string, timestamp o Date) a Date, o null si no es válido.
 * @param {unknown} value
 * @returns {Date | null}
 */
export function asDate(value) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Formatea una fecha como dd-mm-yyyy en hora local.
 * @param {Date} date
 */
export function formatCsvDate(date) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/**
 * Normaliza cualquier valor de celda a texto plano (sin entrecomillar).
 * @param {unknown} value
 * @returns {string}
 */
export function formatCsvValue(value) {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : formatCsvDate(value);
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return String(value);
}

/**
 * Entrecomilla un campo cuando hace falta (RFC 4180).
 * @param {string} text
 * @param {string} separator
 */
export function escapeCsvField(text, separator = CSV_SEPARATOR) {
  const needsQuotes =
    text.includes(separator) || text.includes('"') || text.includes('\n') || text.includes('\r');
  if (!needsQuotes) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * @typedef {Object} CsvColumn
 * @property {string} header Etiqueta de la cabecera.
 * @property {(row: any) => unknown} value Accesor del valor de la celda.
 */

/**
 * Construye el contenido CSV (sin BOM) a partir de filas y una especificación de columnas.
 * @param {any[]} rows
 * @param {CsvColumn[]} columns
 * @param {{ separator?: string }} [options]
 * @returns {string}
 */
export function buildCsv(rows, columns, options = {}) {
  const separator = options.separator ?? CSV_SEPARATOR;
  const encode = (cells) => cells.map((cell) => escapeCsvField(formatCsvValue(cell), separator)).join(separator);
  const lines = [encode(columns.map((column) => column.header))];
  for (const row of rows) {
    lines.push(encode(columns.map((column) => column.value(row))));
  }
  return lines.join(CSV_LINE_BREAK) + CSV_LINE_BREAK;
}

/**
 * Nombre de archivo con patrón `<entidad>-YYYY-MM-DD.csv`.
 * @param {string} entity
 * @param {Date} [date]
 */
export function csvFilename(entity, date = new Date()) {
  const slug = String(entity)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';
  return `${slug}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.csv`;
}

/**
 * Dispara la descarga de un CSV en el navegador (Blob + object URL + click en <a>).
 * Antepone el BOM UTF-8 para que Excel reconozca la codificación.
 * @param {string} csv Contenido generado por buildCsv.
 * @param {string} filename
 */
export function downloadCsv(csv, filename) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([CSV_BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Atajo: construye el CSV de las filas y lo descarga como `<entidad>-YYYY-MM-DD.csv`.
 * @param {string} entity
 * @param {any[]} rows
 * @param {CsvColumn[]} columns
 */
export function exportRowsAsCsv(entity, rows, columns) {
  downloadCsv(buildCsv(rows, columns), csvFilename(entity));
}
