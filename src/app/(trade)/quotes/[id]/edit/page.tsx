import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadBuilderContext } from '@/lib/quotes/builder-context'
import { bundleToInput, loadQuote } from '@/lib/quotes/service'
import { signedPhotoUrls } from '@/lib/photos'
import { QuoteBuilder } from '@/components/quotes/quote-builder'
import { PageShell, PageTitle } from '@/components/ui'

export const metadata = { title: 'Edit quote | WorkedWith' }

/** Edit a draft, or a sent quote (which becomes a new version the client must accept again). */
export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const b = await loadQuote(admin, params.id)
  if (!b || b.quote.trade_user_id !== user.id) notFound()
  if (b.quote.status === 'accepted') redirect(`/jobs/${b.quote.job_id}`)

  const ctx = await loadBuilderContext(admin, user.id)
  const previews = Object.fromEntries((await signedPhotoUrls(admin, b.quote.photo_paths)).map(p => [p.path, p.url]))
  return (
    <PageShell>
      <PageTitle title={b.quote.status === 'draft' ? 'Edit draft quote' : 'Edit and resend quote'} back={{ href: `/jobs/${b.quote.job_id}`, label: 'Job' }} />
      <QuoteBuilder initial={bundleToInput(b)} businessName={ctx.businessName} vatRegistered={ctx.vatRegistered} savedItems={ctx.savedItems} pastQuotes={[]} isNewVersion={b.quote.status !== 'draft'} blockers={ctx.blockers} photoPreviews={previews} />
    </PageShell>
  )
}
