import { mockProvider } from './mock'
import { trueLayerProvider } from './truelayer'
import type { OpenBankingProvider } from './types'

export type { OpenBankingProvider, IncomingPayment } from './types'
export { CONSENT_DAYS } from './types'

/** OPEN_BANKING_PROVIDER picks the adapter: mock (default) or truelayer. */
export function openBanking(): OpenBankingProvider {
  switch (process.env.OPEN_BANKING_PROVIDER) {
    case 'truelayer':
      return trueLayerProvider
    case 'mock':
    default:
      return mockProvider
  }
}

export function isMockOpenBanking(): boolean {
  return openBanking().id === 'mock'
}
