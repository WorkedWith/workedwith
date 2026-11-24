import { TokenExpiredError } from './types'

/** Small JSON fetch helper for the accounting adapters. 401 means the connection needs refreshing. */
export async function jsonFetch<T>(url: string, init: RequestInit & { token?: string; extraHeaders?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(init.extraHeaders ?? {}) }
  if (init.body && typeof init.body === 'string') headers['Content-Type'] = 'application/json'
  if (init.token) headers.Authorization = `Bearer ${init.token}`
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } })
  if (res.status === 401) throw new TokenExpiredError('Connection expired')
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${text.slice(0, 300)}`)
  }
  return (await res.json()) as T
}

/** OAuth2 token request (authorisation code or refresh), form encoded with HTTP basic client auth. */
export async function oauthToken(url: string, clientId: string, clientSecret: string, body: Record<string, string>): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`)
  return (await res.json()) as { access_token: string; refresh_token: string; expires_in: number }
}

export function creds(prefix: string): { id: string; secret: string } {
  const id = process.env[`${prefix}_CLIENT_ID`]
  const secret = process.env[`${prefix}_CLIENT_SECRET`]
  if (!id || !secret) throw new Error(`${prefix} is not configured (${prefix}_CLIENT_ID, ${prefix}_CLIENT_SECRET)`)
  return { id, secret }
}

export const expiresAt = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString()
export const day = (iso: string) => iso.slice(0, 10)
