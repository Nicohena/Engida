/**
 * Shared CSV safety helpers for admin exports.
 *
 * Every cell is quoted, embedded quotes are doubled, and text that a
 * spreadsheet could interpret as a formula is prefixed with a single quote.
 */
export function escapeCsv(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function buildCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');
}
