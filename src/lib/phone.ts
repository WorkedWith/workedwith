/** UK mobile to E.164 (+447...). Returns null if it isn't a UK mobile. */
export function normaliseUkMobile(raw: string): string | null {
  const c = raw.replace(/[\s\-().]/g, '')
  if (/^\+447\d{9}$/.test(c)) return c
  if (/^00447\d{9}$/.test(c)) return '+' + c.slice(2)
  if (/^07\d{9}$/.test(c)) return '+44' + c.slice(1)
  if (/^7\d{9}$/.test(c)) return '+44' + c
  return null
}

/** +447700900123 to "07••• •••123" */
export function maskMobile(e164: string | null | undefined): string {
  if (!e164) return 'your mobile'
  const local = e164.startsWith('+44') ? '0' + e164.slice(3) : e164
  return `${local.slice(0, 2)}••• •••${local.slice(-3)}`
}
