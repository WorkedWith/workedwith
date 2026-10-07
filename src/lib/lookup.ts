export const DAILY_LOOKUP_LIMIT = 30

export type LookupKind = 'email' | 'phone' | 'username'

export type LookupIdentifier = { kind: LookupKind; value: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Turns a UK mobile typed any common way into +447XXXXXXXXX, or null if it is not one. */
export function normaliseUkMobile(raw: string): string | null {
  const c = raw.replace(/[\s\-().]/g, '')
  if (/^\+447\d{9}$/.test(c)) return c
  if (/^447\d{9}$/.test(c)) return `+${c}`
  if (/^00447\d{9}$/.test(c)) return `+${c.slice(2)}`
  if (/^07\d{9}$/.test(c)) return `+44${c.slice(1)}`
  return null
}

/** Decides whether the box holds an email, a mobile number or a username. */
export function classifyIdentifier(input: string): LookupIdentifier {
  const trimmed = input.trim()
  if (EMAIL_RE.test(trimmed)) return { kind: 'email', value: trimmed.toLowerCase() }
  const phone = normaliseUkMobile(trimmed)
  if (phone) return { kind: 'phone', value: phone }
  return { kind: 'username', value: trimmed }
}

/** Escapes % and _ so a username is always matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, m => `\\${m}`)
}
