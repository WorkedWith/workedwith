import { CONSENT_DAYS, type IncomingPayment, type OpenBankingProvider } from './types'

/**
 * TrueLayer Data API adapter (account information only). Written against TrueLayer's public docs.
 * TODO(keys): needs TRUELAYER_CLIENT_ID and TRUELAYER_CLIENT_SECRET, and testing in the TrueLayer sandbox
 * (TRUELAYER_ENV=sandbox) before going live. The provider is not chosen yet (PRD 19 item 1); if a different
 * provider wins, write a sibling adapter with the same interface and change OPEN_BANKING_PROVIDER.
 */
function hosts() {
  const sandbox = process.env.TRUELAYER_ENV !== 'live'
  return {
    auth: sandbox ? 'https://auth.truelayer-sandbox.com' : 'https://auth.truelayer.com',
    api: sandbox ? 'https://api.truelayer-sandbox.com' : 'https://api.truelayer.com',
  }
}

function creds() {
  const id = process.env.TRUELAYER_CLIENT_ID
  const secret = process.env.TRUELAYER_CLIENT_SECRET
  if (!id || !secret) throw new Error('TrueLayer is not configured (TRUELAYER_CLIENT_ID, TRUELAYER_CLIENT_SECRET)')
  return { id, secret }
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number }

async function token(body: Record<string, string>): Promise<TokenResponse> {
  const { id, secret } = creds()
  const res = await fetch(`${hosts().auth}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...body }).toString(),
  })
  if (!res.ok) throw new Error(`TrueLayer token request failed: ${res.status}`)
  return (await res.json()) as TokenResponse
}

async function api<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${hosts().api}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`TrueLayer API ${path} failed: ${res.status}`)
  return (await res.json()) as T
}

type TlAccount = { account_id: string; provider?: { display_name?: string }; account_number?: { number?: string; sort_code?: string } }
type TlTransaction = {
  transaction_id: string
  timestamp: string
  amount: number
  transaction_type: string
  description?: string
  meta?: { provider_reference?: string; counter_party_preferred_name?: string; provider_transaction_id?: string }
}

export const trueLayerProvider: OpenBankingProvider = {
  id: 'truelayer',
  label: 'TrueLayer',

  async confirmationOfPayee() {
    // TODO(provider): TrueLayer offers account holder verification as a separate product. Until it is
    // contracted, return 'unavailable' so the trade is not blocked (PRD 4: "where available").
    return { result: 'unavailable', matchedName: null }
  },

  async authorisationUrl({ state, redirectUri }) {
    const { id } = creds()
    const u = new URL(hosts().auth)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('client_id', id)
    // Read only. No payments scope is ever requested.
    u.searchParams.set('scope', 'info accounts transactions offline_access')
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('providers', process.env.TRUELAYER_ENV === 'live' ? 'uk-ob-all uk-oauth-all' : 'uk-cs-mock uk-ob-all uk-oauth-all')
    u.searchParams.set('state', state)
    return u.toString()
  },

  async completeConnection({ code, redirectUri }) {
    const t = await token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    const accounts = await api<{ results: TlAccount[] }>('/data/v1/accounts', t.access_token)
    const first = accounts.results[0]
    return {
      connectionSecret: JSON.stringify({ refresh: t.refresh_token }),
      bankName: first?.provider?.display_name ?? 'Your bank',
      consentExpiresAt: new Date(Date.now() + CONSENT_DAYS * 86_400_000),
      accounts: accounts.results.map(a => ({
        sortCode: a.account_number?.sort_code?.replace(/\D/g, '') ?? null,
        accountNumberLast4: a.account_number?.number?.slice(-4) ?? null,
      })),
    }
  },

  async listIncomingPayments({ connectionSecret, since }) {
    const { refresh } = JSON.parse(connectionSecret) as { refresh: string }
    const t = await token({ grant_type: 'refresh_token', refresh_token: refresh })
    const accounts = await api<{ results: TlAccount[] }>('/data/v1/accounts', t.access_token)
    const payments: IncomingPayment[] = []
    const from = since.toISOString()
    const to = new Date().toISOString()
    for (const a of accounts.results) {
      const tx = await api<{ results: TlTransaction[] }>(
        `/data/v1/accounts/${a.account_id}/transactions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        t.access_token,
      )
      for (const r of tx.results) {
        // Incoming only
        if (r.transaction_type !== 'CREDIT' || r.amount <= 0) continue
        payments.push({
          providerTransactionId: r.meta?.provider_transaction_id ?? r.transaction_id,
          receivedAt: new Date(r.timestamp),
          amountPence: Math.round(r.amount * 100),
          payerName: r.meta?.counter_party_preferred_name ?? null,
          // TODO(sandbox): confirm which field carries the payer's reference for each bank
          reference: r.meta?.provider_reference ?? r.description ?? null,
        })
      }
    }
    // Refresh tokens rotate, so hand back the new one to store
    return { payments, connectionSecret: JSON.stringify({ refresh: t.refresh_token }) }
  },

  async revoke({ connectionSecret }) {
    // TODO(sandbox): TrueLayer revokes access via DELETE /api/delete on the auth host with the access token
    const { refresh } = JSON.parse(connectionSecret) as { refresh: string }
    const t = await token({ grant_type: 'refresh_token', refresh_token: refresh })
    await fetch(`${hosts().auth}/api/delete`, { method: 'DELETE', headers: { Authorization: `Bearer ${t.access_token}` } })
  },
}
