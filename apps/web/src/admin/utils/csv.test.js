import { describe, expect, it } from 'vitest';
import {
  asDate,
  buildCsv,
  csvFilename,
  escapeCsvField,
  formatCsvDate,
  formatCsvValue
} from './csv.js';

describe('formatCsvValue', () => {
  it('renders null and undefined as empty cells', () => {
    expect(formatCsvValue(null)).toBe('');
    expect(formatCsvValue(undefined)).toBe('');
  });

  it('renders booleans as Sí / No', () => {
    expect(formatCsvValue(true)).toBe('Sí');
    expect(formatCsvValue(false)).toBe('No');
  });

  it('renders dates as dd-mm-yyyy', () => {
    expect(formatCsvValue(new Date(2026, 2, 5, 12))).toBe('05-03-2026');
    expect(formatCsvValue(new Date('invalid'))).toBe('');
  });

  it('renders numbers and strings verbatim', () => {
    expect(formatCsvValue(1234)).toBe('1234');
    expect(formatCsvValue(4.5)).toBe('4.5');
    expect(formatCsvValue(Number.NaN)).toBe('');
    expect(formatCsvValue('Lodge Río Puelo')).toBe('Lodge Río Puelo');
  });
});

describe('asDate', () => {
  it('parses ISO strings and keeps Date instances', () => {
    const iso = '2026-03-05T15:00:00.000Z';
    expect(asDate(iso)?.toISOString()).toBe(iso);
    const date = new Date(2026, 0, 1);
    expect(asDate(date)).toBe(date);
  });

  it('returns null for empty or invalid input', () => {
    expect(asDate(null)).toBeNull();
    expect(asDate('')).toBeNull();
    expect(asDate('no-es-fecha')).toBeNull();
  });
});

describe('escapeCsvField', () => {
  it('leaves plain text untouched', () => {
    expect(escapeCsvField('hola')).toBe('hola');
    expect(escapeCsvField('a, b')).toBe('a, b');
  });

  it('quotes fields containing the separator, quotes or newlines', () => {
    expect(escapeCsvField('a;b')).toBe('"a;b"');
    expect(escapeCsvField('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(escapeCsvField('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(escapeCsvField('línea 1\r\nlínea 2')).toBe('"línea 1\r\nlínea 2"');
  });

  it('respects a custom separator', () => {
    expect(escapeCsvField('a,b', ',')).toBe('"a,b"');
    expect(escapeCsvField('a;b', ',')).toBe('a;b');
  });
});

describe('buildCsv', () => {
  const columns = [
    { header: 'Documento BSale', value: (row) => row.bsaleDocumentId },
    { header: 'Nombre', value: (row) => row.firstName },
    { header: 'Comentario', value: (row) => row.comment },
    { header: 'Tiene reseña', value: (row) => row.hasReview },
    { header: 'Creada', value: (row) => asDate(row.createdAt) }
  ];

  it('emits a header row and CRLF line endings with ; separator', () => {
    const csv = buildCsv([], columns);
    expect(csv).toBe('Documento BSale;Nombre;Comentario;Tiene reseña;Creada\r\n');
  });

  it('formats every cell through the value rules and quotes as needed', () => {
    const rows = [
      {
        bsaleDocumentId: 1001,
        firstName: 'María José',
        comment: 'Excelente; volveremos "seguro"\ngracias',
        hasReview: true,
        createdAt: new Date(2026, 9, 6, 10).toISOString()
      },
      {
        bsaleDocumentId: null,
        firstName: 'Juan',
        comment: '',
        hasReview: false,
        createdAt: null
      }
    ];
    const csv = buildCsv(rows, columns);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('1001;María José;"Excelente; volveremos ""seguro""\ngracias";Sí;06-10-2026');
    expect(lines[2]).toBe(';Juan;;No;');
    expect(lines[3]).toBe('');
  });

  it('does not add a BOM to the string itself', () => {
    expect(buildCsv([], columns).charCodeAt(0)).not.toBe(0xfeff);
  });
});

describe('formatCsvDate', () => {
  it('zero-pads day and month', () => {
    expect(formatCsvDate(new Date(2026, 0, 9))).toBe('09-01-2026');
  });
});

describe('csvFilename', () => {
  it('builds <entidad>-YYYY-MM-DD.csv', () => {
    expect(csvFilename('cotizaciones', new Date(2026, 9, 6))).toBe('cotizaciones-2026-10-06.csv');
  });

  it('slugifies accents and spaces', () => {
    expect(csvFilename('Reseñas visibles', new Date(2026, 0, 1))).toBe('resenas-visibles-2026-01-01.csv');
  });
});
