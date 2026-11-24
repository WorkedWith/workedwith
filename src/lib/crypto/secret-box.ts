import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

/**
 * AES 256 GCM for data that must be stored encrypted (bank account numbers, provider tokens).
 * Key: DATA_ENCRYPTION_KEY, 32 bytes as base64. Outside production a fixed development key is used
 * so the app runs without set up; production refuses to start without a real key.
 * Format: v1.<iv>.<tag>.<ciphertext>, all base64url.
 */
function key(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY
  if (raw) {
    const buf = Buffer.from(raw, 'base64')
    if (buf.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes, base64 encoded')
    return buf
  }
  if (process.env.VERCEL_ENV === 'production') throw new Error('DATA_ENCRYPTION_KEY is not set')
  return createHash('sha256').update('workedwith-development-only-key').digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.')
}

export function decryptSecret(boxed: string): string {
  const [v, iv, tag, enc] = boxed.split('.')
  if (v !== 'v1' || !iv || !tag || !enc) throw new Error('Unrecognised encrypted value')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64url')), decipher.final()]).toString('utf8')
}
