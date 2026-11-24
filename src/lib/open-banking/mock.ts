import { APP_URL } from '@/lib/app-url'
import { CONSENT_DAYS, type OpenBankingProvider } from './types'

/**
 * Mock provider (OPEN_BANKING_PROVIDER=mock). Lets the whole flow be clicked through with no keys:
 * a pretend bank picker, a connection that lasts 90 days, and incoming payments created from the
 * "Simulate a bank transfer" button on Getting paid.
 */
export const mockProvider: OpenBankingProvider = {
  id: 'mock',
  label: 'Test bank (mock)',

  async confirmationOfPayee({ accountName }) {
    const name = accountName.trim()
    // Any name containing "wrong" fails, "close" is a near match, everything else matches
    if (/wrong/i.test(name)) return { result: 'no_match', matchedName: null }
    if (/close/i.test(name)) return { result: 'close_match', matchedName: name.replace(/close/i, '').trim() || name }
    return { result: 'match', matchedName: name }
  },

  async authorisationUrl({ state, redirectUri }) {
    const u = new URL(`${APP_URL}/profile/getting-paid/mock-bank`)
    u.searchParams.set('state', state)
    u.searchParams.set('redirect_uri', redirectUri)
    return u.toString()
  },

  async completeConnection({ code }) {
    const bank = code.replace(/^mock_/, '') || 'Test Bank'
    return {
      connectionSecret: `mock-connection-${Date.now()}`,
      bankName: bank,
      consentExpiresAt: new Date(Date.now() + CONSENT_DAYS * 86_400_000),
      accounts: [{ sortCode: null, accountNumberLast4: null }],
    }
  },

  async listIncomingPayments() {
    return { payments: [] }
  },

  async revoke() {
    // Nothing to do
  },
}
