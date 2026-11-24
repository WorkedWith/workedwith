/** RFC 4180 CSV. Money columns are pounds with two decimals so spreadsheets read them as numbers. */
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    // Stop spreadsheet formula injection
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

export const pounds = (pence: number) => (pence / 100).toFixed(2)
export const isoDate = (iso: string) => iso.slice(0, 10)
