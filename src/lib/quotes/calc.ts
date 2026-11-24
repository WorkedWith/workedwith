// Pure quote maths, used by the builder preview and the server. Integer pence only.

import { percentOf, vatOn } from '@/lib/money'
import type { DepositFor, NonRefundableFrom, PaymentTiming, PlannedStartType, ClientKind } from '@/types/v42'

export type LineInput = { description: string; pricePence: number }
export type StageInput = { name: string; amountPence: number }

export type DepositInput = {
  required: boolean
  mode: 'amount' | 'percent'
  percent: number
  amountPence: number
  for: DepositFor
  refundable: boolean
  nonRefundableFrom: NonRefundableFrom | null
}

export type QuoteDraftInput = {
  quoteId?: string | null
  jobId?: string | null
  client: { kind: ClientKind; name: string; companyName: string; mobile: string; email: string; jobAddress: string }
  title: string
  description: string
  lines: LineInput[]
  vatApplies: boolean
  validDays: number
  plannedStart: { type: PlannedStartType; date: string | null }
  deposit: DepositInput
  timing: PaymentTiming
  stages: StageInput[]
  extraTerms: string
  followUps: boolean
  photoPaths: string[]
}

export type Totals = { netPence: number; vatPence: number; totalPence: number }

export function quoteTotals(lines: LineInput[], vatApplies: boolean, rateBp = 2000): Totals {
  const net = lines.reduce((s, l) => s + Math.max(0, Math.round(l.pricePence || 0)), 0)
  const vat = vatApplies ? vatOn(net, rateBp) : 0
  return { netPence: net, vatPence: vat, totalPence: net + vat }
}

export function depositPence(d: DepositInput, totalPence: number): number {
  if (!d.required) return 0
  if (d.mode === 'percent') return percentOf(totalPence, Math.min(100, Math.max(0, d.percent)))
  return Math.max(0, Math.round(d.amountPence))
}

/** The stages the client will pay after any deposit. On completion is one final stage. */
export function plannedStages(input: Pick<QuoteDraftInput, 'timing' | 'stages'>, totalPence: number, deposit: number): StageInput[] {
  if (input.timing === 'on_completion') {
    const balance = totalPence - deposit
    return balance > 0 ? [{ name: 'Balance on completion', amountPence: balance }] : []
  }
  return input.stages.map(s => ({ name: s.name.trim(), amountPence: Math.round(s.amountPence) }))
}

export type QuoteProblem = string

/** Everything that stops a quote being sent (PRD 6). Empty means it can go. */
export function quoteProblems(q: QuoteDraftInput): QuoteProblem[] {
  const out: QuoteProblem[] = []
  if (!q.client.name.trim()) out.push('Add the client’s name.')
  if (q.client.kind === 'company' && !q.client.companyName.trim()) out.push('Add the company name.')
  if (!q.client.mobile.trim()) out.push('Add the client’s mobile number.')
  if (!q.client.email.trim()) out.push('Add the client’s email address.')
  if (!q.title.trim()) out.push('Give the job a title.')
  const lines = q.lines.filter(l => l.description.trim() || l.pricePence > 0)
  if (lines.length === 0) out.push('Add at least one line with a price.')
  if (lines.some(l => !l.description.trim())) out.push('Every line needs a description.')
  const t = quoteTotals(lines, q.vatApplies)
  if (t.totalPence <= 0) out.push('The quote total must be more than £0.')
  if (q.plannedStart.type === 'date' && !q.plannedStart.date) out.push('Pick a planned start date.')
  const dep = depositPence(q.deposit, t.totalPence)
  if (q.deposit.required) {
    if (dep <= 0) out.push('Set the deposit amount.')
    if (dep >= t.totalPence) out.push('The deposit must be less than the quote total.')
    if (!q.deposit.refundable && !q.deposit.nonRefundableFrom) out.push('Pick when the deposit becomes non refundable.')
    if (q.deposit.nonRefundableFrom === 'payment' && q.client.kind !== 'company') {
      out.push('Non refundable from payment is only for company clients.')
    }
  }
  if (q.timing === 'in_stages') {
    if (q.stages.length === 0) out.push('Add at least one stage.')
    if (q.stages.some(s => !s.name.trim())) out.push('Every stage needs a name.')
    if (q.stages.some(s => s.amountPence <= 0)) out.push('Every stage needs an amount.')
  }
  const stageSum = plannedStages(q, t.totalPence, dep).reduce((s, x) => s + x.amountPence, 0)
  if (t.totalPence > 0 && dep + stageSum !== t.totalPence) {
    out.push('The deposit and stages must add up to the quote total.')
  }
  return out
}

/** Split a gross stage amount into net and VAT in proportion to the quote, for invoices. */
export function splitGross(grossPence: number, quoteNet: number, quoteVat: number): { net: number; vat: number } {
  const total = quoteNet + quoteVat
  if (total <= 0 || quoteVat === 0) return { net: grossPence, vat: 0 }
  const vat = Math.round((grossPence * quoteVat) / total)
  return { net: grossPence - vat, vat }
}
