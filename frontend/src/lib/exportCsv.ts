/**
 * exportCsv.ts — pure client-side CSV helpers (no extra packages)
 */

/** Escape a cell value for RFC 4180 CSV */
function escapeCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Wrap in quotes if the value contains comma, newline, or double-quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/** Convert an array of objects to a CSV string */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
    if (rows.length === 0) return '';
    const keys = columns ?? Object.keys(rows[0]);
    const header = keys.map(escapeCell).join(',');
    const body = rows.map(row => keys.map(k => escapeCell(row[k])).join(',')).join('\n');
    return `${header}\n${body}`;
}

/** Trigger a browser download of a CSV file */
export function downloadCsv(content: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' }); // \uFEFF = BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Sanitise a string for use as a filename */
export function safeFilename(...parts: string[]): string {
    return parts.map(p => p.replace(/[^a-z0-9_\-]/gi, '_')).join('_');
}
