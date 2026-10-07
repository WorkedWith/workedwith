export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
const USERNAME_RE = /^[a-z0-9][a-z0-9_.]*$/

export const USERNAME_HELP =
  `${USERNAME_MIN} to ${USERNAME_MAX} characters. Letters, numbers, dots and underscores only.`

/** Lower cases and trims. Returns an error message, or null when the username is valid. */
export function validateUsername(raw: string): { value: string; error: string | null } {
  const value = raw.trim().replace(/^@/, '').toLowerCase()
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return { value, error: `Your username must be ${USERNAME_MIN} to ${USERNAME_MAX} characters.` }
  }
  if (!USERNAME_RE.test(value)) {
    return { value, error: 'Use letters, numbers, dots and underscores only, starting with a letter or number.' }
  }
  return { value, error: null }
}

/** A friendly starting suggestion from someone's name, for example "jasmine.tiler". */
export function suggestUsername(fullName: string): string {
  const parts = fullName
    .toLowerCase()
    .split(/\s+/)
    .map(p => p.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
  const base = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] ?? 'client'
  return base.slice(0, USERNAME_MAX)
}
