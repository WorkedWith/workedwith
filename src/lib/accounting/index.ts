import { mockProvider } from './mock'
import { xero } from './xero'
import { quickbooks } from './quickbooks'
import { freeagent } from './freeagent'
import { sage } from './sage'
import { PLATFORM_LABEL, type AccountingProvider } from './types'
import type { AccountingPlatform } from '@/types/v42'

export { PLATFORM_LABEL }
export const PLATFORMS: AccountingPlatform[] = ['xero', 'quickbooks', 'freeagent', 'sage']

/** ACCOUNTING_MODE=mock (the default) uses the mock for every platform; live uses the real adapters. */
export function accountingMode(): 'mock' | 'live' {
  return process.env.ACCOUNTING_MODE === 'live' ? 'live' : 'mock'
}

export function accountingProvider(platform: AccountingPlatform): AccountingProvider {
  if (accountingMode() === 'mock') return mockProvider(platform, PLATFORM_LABEL[platform])
  return { xero, quickbooks, freeagent, sage }[platform]
}
