import { createHmac } from 'crypto'

export type IdDocumentType = 'driving_licence' | 'passport'

export const ID_DOCUMENT_LABELS: Record<IdDocumentType, string> = {
  driving_licence: 'Driving licence',
  passport: 'Passport',
}

export function isIdDocumentType(value: unknown): value is IdDocumentType {
  return value === 'driving_licence' || value === 'passport'
}

/** Upper case, letters and digits only, so spacing and dashes never change the hash. */
export function normaliseIdNumber(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * One way, keyed hash of a document number. The raw number is never stored.
 * Key: ID_HASH_PEPPER (set this in Vercel and never change it), falling back to CRON_SECRET.
 */
export function hashIdNumber(type: IdDocumentType, rawNumber: string): string | null {
  const key = process.env.ID_HASH_PEPPER ?? process.env.CRON_SECRET
  const number = normaliseIdNumber(rawNumber)
  if (!key || number.length < 5) return null
  return createHmac('sha256', key).update(`${type}:${number}`).digest('hex')
}
