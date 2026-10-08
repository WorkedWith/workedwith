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

/**
 * The name shown to a tradesperson after a lookup, so they can confirm they have the right client.
 * Individuals: first name and last initial only ("Adam M."). Businesses: the company name.
 */
export function clientLookupName(cp: {
  client_type: string | null
  company_name: string | null
  display_name: string | null
}): string | null {
  if (cp.client_type === 'business' && cp.company_name?.trim()) return cp.company_name.trim()
  const parts = (cp.display_name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return cp.company_name?.trim() || null
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}
