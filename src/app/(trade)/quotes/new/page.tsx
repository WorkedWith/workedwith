import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadBuilderContext } from '@/lib/quotes/builder-context'
import { bundleToInput, loadQuote } from '@/lib/quotes/service'
import { QuoteBuilder } from '@/components/quotes/quote-builder'
import { PageShell, PageTitle } from '@/components/ui'

export const metadata = { title: 'New quote | WorkedWith' }

export default async function NewQuotePage({ searchParams }: { searchParams: { copy?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const { data: tp } = await admin.from('trade_profiles').select('id').eq('user_id', user.id).maybeSingle()
  if (!tp) redirect('/onboarding/trade')

  const ctx = await loadBuilderContext(admin, user.id)
  let initial = ctx.defaults
  if (searchParams.copy) {
    const b = await loadQuote(admin, searchParams.copy)
    if (b && b.quote.trade_user_id === user.id) initial = { ...bundleToInput(b, { copy: true }), extraTerms: b.quote.extra_terms ?? ctx.defaults.extraTerms }
  }

  return (
    <PageShell>
      <PageTitle title="New quote" back={{ href: '/jobs', label: 'Jobs' }} />
      <QuoteBuilder initial={initial} businessName={ctx.businessName} vatRegistered={ctx.vatRegistered} savedItems={ctx.savedItems} pastQuotes={ctx.pastQuotes} isNewVersion={false} blockers={ctx.blockers} photoPreviews={{}} />
    </PageShell>
  )
}
