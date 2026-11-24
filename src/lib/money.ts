/** Money is always integer pence (key rule 22). These are the only conversions to and from pounds. */

export function formatPence(pence: number, opts?: { showZeroPence?: boolean }): string {
  const negative = pence < 0
  const abs = Math.abs(Math.round(pence))
  const pounds = Math.floor(abs / 100)
  const p = abs % 100
  const whole = pounds.toLocaleString('en-GB')
  const text = p === 0 && !opts?.showZeroPence ? `£${whole}` : `£${whole}.${String(p).padStart(2, '0')}`
  return negative ? `minus ${text}` : text
}

/** Always two decimal places, for invoices and tables. */
export function formatPenceExact(pence: number): string {
  return formatPence(pence, { showZeroPence: true })
}

/** "1,250.5" or "£1250.50" to 125050. Returns null if it is not a valid amount. */
export function parsePounds(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  return parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10)
}

export function penceToInput(pence: number): string {
  return (pence / 100).toFixed(2)
}

/** VAT at a rate in basis points (2000 = 20%), rounded to the nearest penny. */
export function vatOn(netPence: number, rateBasisPoints = 2000): number {
  return Math.round((netPence * rateBasisPoints) / 10000)
}

export function percentOf(totalPence: number, percent: number): number {
  return Math.round((totalPence * percent) / 100)
}
