/** Small formatting helpers shared by email senders. */

export function formatDateLong(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

/** "M20 3HD" becomes "M20". Strangers only ever see the district. */
export function outwardCode(postcode: string): string {
  const p = postcode.trim().toUpperCase().replace(/\s+/g, '')
  return p.length > 3 ? p.slice(0, p.length - 3) : p
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}
