import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadQuote } from '@/lib/quotes/service'
import { signedPhotoUrls } from '@/lib/photos'
import { getTradeSender, messageTrade } from '@/lib/messages/send'
import { tradeQuoteEventEmail } from '@/lib/email/templates-v42'
import { fromStoredType } from '@/lib/clients/accounts'
import { CANCELLATION_NOTICE, EARLY_START_CONSENT, STANDARD_TERMS, depositWording, needsEarlyStartConsentAtAcceptance } from '@/lib/quotes/wording'
import { QUOTE_STATUS_LABEL } from '@/lib/jobs/status'
import { QuoteDocument } from '@/components/quotes/quote-document'
import { Notice } from '@/components/ui'
import { AcceptPanel } from './accept-panel'

export const metadata = { title: 'Your quote | WorkedWith', robots: { index: false } }

/** The client's quote page (PRD 5, 18). Phone first: price and what they are agreeing to at the top. */
export default async function ClientQuotePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/sign-in/code?next=/my/quotes/${params.id}`)
  const admin = createAdminClient()
  const b = await loadQuote(admin, params.id)
  if (!b || b.quote.status === 'draft') notFound()
  const { data: job } = await admin.from('jobs').select('id, client_user_id').eq('id', b.quote.job_id).maybeSingle()
  if (!job || job.client_user_id !== user.id) notFound()
  const q = { ...b.quote }
  let status: typeof q.status = q.status

  // First open by the client: mark viewed and tell the trade (PRD 6)
  if (status === 'sent') {
    const now = new Date().toISOString()
    await admin.from('quotes').update({ status: 'viewed', viewed_at: now }).eq('id', q.id).eq('status', 'sent')
    status = 'viewed'
    await messageTrade(admin, {
      tradeUserId: q.trade_user_id, type: 'quote', title: `${q.client_name} opened your quote`, body: q.title, link: `/jobs/${q.job_id}`,
      email: tradeQuoteEventEmail({ title: q.title, client: q.client_name, event: 'viewed', jobId: q.job_id }),
    })
  }

  const sender = await getTradeSender(admin, q.trade_user_id)
  const { data: cp } = await admin.from('client_profiles').select('client_type').eq('user_id', user.id).maybeSingle()
  const kind = q.client_type_at_acceptance ?? fromStoredType(cp?.client_type as string | null)
  const photos = await signedPhotoUrls(admin, q.photo_paths)
  const open = status === 'viewed'
  const expired = new Date(`${q.valid_until}T23:59:59Z`) < new Date()
  const dw = q.deposit_required ? depositWording({ amountPence: q.deposit_amount_pence, for: q.deposit_for, refundable: q.deposit_refundable, nonRefundableFrom: q.deposit_non_refundable_from, clientKind: kind }) : null

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-28 pt-5">
      {!open && <Notice tone={status === 'accepted' ? 'green' : 'amber'}>This quote is {QUOTE_STATUS_LABEL[status].toLowerCase()}.{status === 'accepted' && <> <a className="underline" href={`/my/jobs/${q.job_id}`}>Go to the job</a></>}</Notice>}
      {open && expired && <Notice tone="amber">This quote has passed its valid until date. Ask {sender.businessName} for a new one.</Notice>}

      <QuoteDocument q={{
        businessName: sender.businessName, title: q.title, description: q.description, clientName: q.client_name, clientCompany: q.client_company_name,
        jobAddress: q.job_address, lines: b.lines.map(l => ({ description: l.description, pricePence: l.price_pence })), vatApplies: q.vat_applies,
        netPence: q.net_pence, vatPence: q.vat_pence, totalPence: q.total_pence,
        deposit: { required: q.deposit_required, amountPence: q.deposit_amount_pence, for: q.deposit_for, refundable: q.deposit_refundable, nonRefundableFrom: q.deposit_non_refundable_from },
        stages: q.payment_timing === 'on_completion' ? [{ name: 'Balance on completion', amountPence: q.total_pence - q.deposit_amount_pence }] : b.stages.map(s => ({ name: s.name, amountPence: s.amount_pence })),
        plannedStart: { type: q.planned_start_type, date: q.planned_start_date }, validUntil: q.valid_until, clientKind: kind, version: q.version, photos,
      }} />

      {open && !expired && (
        <AcceptPanel
          quoteId={q.id}
          isPerson={kind === 'person'}
          consentNeeded={needsEarlyStartConsentAtAcceptance(kind, q.planned_start_type, q.planned_start_date)}
          consentWording={EARLY_START_CONSENT}
          deposit={{ required: q.deposit_required, amountPence: q.deposit_amount_pence, wording: dw }}
        />
      )}

      <details className="rounded-2xl border border-gray-200 bg-white p-5">
        <summary className="min-h-[32px] cursor-pointer text-base font-semibold text-brand-navy">Terms</summary>
        <div className="mt-3 space-y-3 whitespace-pre-line text-sm text-gray-700">
          <p>{STANDARD_TERMS}</p>
          {q.extra_terms && <><p className="font-semibold">Extra terms from {sender.businessName}</p><p>{q.extra_terms}</p></>}
        </div>
      </details>
      {kind === 'person' && (
        <details className="rounded-2xl border border-gray-200 bg-white p-5">
          <summary className="min-h-[32px] cursor-pointer text-base font-semibold text-brand-navy">Cancellation notice</summary>
          <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{CANCELLATION_NOTICE}</p>
        </details>
      )}
    </main>
  )
}
