import { randomUUID } from 'crypto'
import { APP_URL } from '@/lib/app-url'
import type { AccountingProvider } from './types'

const ACCOUNTS = {
  sales: [{ id: '200', code: '200', name: 'Sales' }, { id: '260', code: '260', name: 'Other revenue' }],
  bank: [{ id: 'bank-1', code: '090', name: 'Business current account' }, { id: 'bank-2', code: '091', name: 'Savings' }],
}

/**
 * Mock adapter (ACCOUNTING_MODE=mock). Every platform works end to end with no keys. A contact name
 * containing "fail" makes the sync fail, so the retry and "Needs you" screens can be tried.
 */
export function mockProvider(platform: AccountingProvider['platform'], label: string): AccountingProvider {
  const id = (t: string) => `mock-${t}-${randomUUID().slice(0, 8)}`
  return {
    platform,
    label,
    authorisationUrl({ state, redirectUri }) {
      const u = new URL(`${APP_URL}/profile/getting-paid/mock-accounting`)
      u.searchParams.set('platform', platform)
      u.searchParams.set('state', state)
      u.searchParams.set('redirect_uri', redirectUri)
      return u.toString()
    },
    async completeConnection() {
      return {
        tokens: { access: 'mock-access', refresh: 'mock-refresh', expiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString() },
        orgId: 'mock-org', orgName: `Test company (${label})`,
        salesAccounts: ACCOUNTS.sales, bankAccounts: ACCOUNTS.bank, defaultSales: '200', defaultBank: 'bank-1',
      }
    },
    async refresh(t) { return { ...t, expiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString() } },
    async upsertContact(_ctx, c) {
      if (/fail/i.test(c.name)) throw new Error('Test failure: the accounting software rejected this contact')
      return id('contact')
    },
    async createInvoice() { return id('invoice') },
    async recordPayment() { return id('payment') },
    async createCreditNote() { return id('credit') },
    async recordRefund() { return id('refund') },
    async disconnect() { /* nothing */ },
  }
}
