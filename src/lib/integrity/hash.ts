import { createHmac } from 'crypto'
import { headers } from 'next/headers'

function key(): string {
  // Optional dedicated secret; otherwise derive from the service role key so nothing new is needed
  return process.env.INTEGRITY_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'workedwith-integrity'
}

/** One way salted hash. The raw value is never stored. */
export function hashSignal(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  return createHmac('sha256', key()).update(v).digest('hex').slice(0, 32)
}

/** Hashes of the caller's network and browser, from the current request. */
export async function requestFingerprint(): Promise<{ ipHash: string | null; deviceHash: string | null }> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  const ua = h.get('user-agent') ?? null
  return { ipHash: hashSignal(ip), deviceHash: hashSignal(ua) }
}
