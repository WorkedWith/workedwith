import type { createAdminClient } from '@/lib/supabase/admin'
import { normaliseReference } from '@/lib/invoices/issue'
import { messageTrade } from '@/lib/messages/send'
import { paymentTradeEmail } from '@/lib/email/templates-v42'
import { formatPence } from '@/lib/money'
import { recordPayment } from './apply'
import type { IncomingPayment } from '@/lib/open-banking'
import type { Invoice } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type MatchOutcome = 'matched' | 'part_payment' | 'overpayment' | 'suggested' | 'ignored' | 'duplicate'

function nameFits(payer: string | null, names: string[]): boolean {
  if (!payer) return false
  const p = payer.toUpperCase()
  return names.some(n => n.toUpperCase().split(/\s+/).filter(t => t.length >= 3).some(t => p.includes(t)))
}

/**
 * Automatic matching (PRD 9). Only payments that match or probably match an invoice are stored; everything
 * else is ignored and never saved (key rule 10).
 */
export async function processIncomingPayment(admin: AdminClient, tradeId: string, p: IncomingPayment): Promise<MatchOutcome> {
  const { data: seen } = await admin.from('bank_matches').select('id').eq('trade_id', tradeId).eq('provider_transaction_id', p.providerTransactionId).maybeSingle()
  if (seen) return 'duplicate'

  const { data: open } = await admin.from('invoices').select('*').eq('trade_id', tradeId).in('status', ['issued', 'part_paid'])
  const invoices = (open ?? []) as Invoice[]
  if (invoices.length === 0) return 'ignored'

  const ref = p.reference ? normaliseReference(p.reference) : ''
  const byRef = ref ? invoices.find(i => ref.includes(normaliseReference(i.invoice_number))) : undefined

  const base = {
    trade_id: tradeId,
    provider_transaction_id: p.providerTransactionId,
    received_at: p.receivedAt.toISOString(),
    amount_pence: p.amountPence,
    payer_name: p.payerName,
    reference: p.reference,
  }

  if (byRef && byRef.stage_id) {
    const balance = byRef.total_pence - byRef.amount_paid_pence
    const status = p.amountPence === balance ? 'matched' : p.amountPence < balance ? 'part_payment' : 'overpayment'
    const { data: m } = await admin.from('bank_matches').insert({ ...base, match_status: status, invoice_id: byRef.id, decided_at: new Date().toISOString() }).select('id').single()
    const amount = status === 'overpayment' ? balance : p.amountPence
    if (amount > 0) {
      await recordPayment(admin, { stageId: byRef.stage_id, amountPence: amount, method: 'bank_transfer_matched', paidAt: p.receivedAt.toISOString(), bankMatchId: m?.id ?? null })
    }
    if (status === 'overpayment') {
      await messageTrade(admin, {
        tradeUserId: tradeId, type: 'payment', title: `Overpayment: ${byRef.invoice_number}`,
        body: `${formatPence(p.amountPence)} arrived against a balance of ${formatPence(balance)}.`, link: `/jobs/${byRef.job_id}`,
        email: paymentTradeEmail({ client: p.payerName ?? 'Your client', amountPence: p.amountPence, invoiceNumber: byRef.invoice_number, jobId: byRef.job_id, event: 'overpaid' }),
      })
    }
    return status
  }

  // Probable match: no usable reference, but the amount and payer name fit exactly one open invoice
  const sameAmount = invoices.filter(i => i.total_pence - i.amount_paid_pence === p.amountPence)
  const fits: Invoice[] = []
  for (const inv of sameAmount) {
    const { data: job } = await admin.from('jobs').select('client_user_id, client_profile_id').eq('id', inv.job_id).maybeSingle()
    const { data: u } = await admin.from('users').select('full_name').eq('id', job?.client_user_id as string).maybeSingle()
    const { data: cp } = await admin.from('client_profiles').select('company_name').eq('user_id', job?.client_user_id as string).maybeSingle()
    const names = [u?.full_name as string | undefined, cp?.company_name as string | undefined].filter((x): x is string => !!x)
    if (nameFits(p.payerName, names)) fits.push(inv)
  }
  if (fits.length !== 1) return 'ignored'
  const inv = fits[0]
  await admin.from('bank_matches').insert({ ...base, match_status: 'suggested', invoice_id: inv.id })
  await messageTrade(admin, {
    tradeUserId: tradeId, type: 'payment', title: `${formatPence(p.amountPence)} from ${p.payerName ?? 'someone'}. Is this ${inv.invoice_number}?`,
    body: 'Nothing is marked paid until you confirm.', link: '/dashboard',
    email: paymentTradeEmail({ client: '', amountPence: p.amountPence, invoiceNumber: inv.invoice_number, jobId: inv.job_id, event: 'suggested', payer: p.payerName }),
  })
  return 'suggested'
}
