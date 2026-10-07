/** Small formatting helpers shared by email senders. */

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

/** For example "7th October 2026" (UK date, London time). */
export function formatDateLong(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London',
  }).formatToParts(d)
  const get = (type: string) => parts.find(x => x.type === type)?.value ?? ''
  return `${ordinal(Number(get('day')))} ${get('month')} ${get('year')}`
}

/** "M20 3HD" becomes "M20". Strangers only ever see the district. */
export function outwardCode(postcode: string): string {
  const p = postcode.trim().toUpperCase().replace(/\s+/g, '')
  return p.length > 3 ? p.slice(0, p.length - 3) : p
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}
