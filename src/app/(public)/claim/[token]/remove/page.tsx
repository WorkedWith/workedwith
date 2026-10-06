import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { removeSeededProfile } from '@/actions/remove-seeded-profile'
import type { SeededProfile } from '@/types/database'

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ done?: string }>
}

export default async function RemoveSeededProfilePage({ params, searchParams }: Props) {
  const { token } = await params
  const { done } = await searchParams

  // Post-deletion redirect: record is gone, show success without a DB hit
  if (done === '1') {
    return (
      <Screen heading="Listing removed">
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          The page has been deleted. We will not create another listing for this business and will
          not contact this number or email again.
        </p>
        <a href="/" className="mt-8 inline-block text-sm text-white/40 hover:text-white/70 transition-colors">
          Back to WorkedWith
        </a>
      </Screen>
    )
  }

  const admin = createAdminClient()
  const { data: raw } = await admin
    .from('seeded_profiles')
    .select('business_name, status')
    .eq('claim_token', token)
    .maybeSingle()

  const profile = raw as Pick<SeededProfile, 'business_name' | 'status'> | null

  if (!profile || profile.status === 'removed') {
    return (
      <Screen heading="Already removed">
        <p className="mt-3 text-sm text-white/60">This listing no longer exists.</p>
        <a href="/" className="mt-8 inline-block text-sm text-white/40 hover:text-white/70 transition-colors">
          Back to WorkedWith
        </a>
      </Screen>
    )
  }

  if (profile.status === 'claimed') {
    return (
      <Screen heading="Listing already claimed">
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          This listing has been claimed by the business owner and cannot be removed via this link.
        </p>
        <a href="/" className="mt-8 inline-block text-sm text-white/40 hover:text-white/70 transition-colors">
          Back to WorkedWith
        </a>
      </Screen>
    )
  }

  // Server action — only runs on form POST
  async function handleRemove() {
    'use server'
    await removeSeededProfile(token)
    redirect(`/claim/${token}/remove?done=1`)
  }

  return (
    <Screen heading="Remove this listing?">
      <p className="mt-3 text-sm text-white/60 leading-relaxed">
        This will permanently delete the listing for{' '}
        <strong className="text-white">{profile.business_name}</strong> from WorkedWith. We will
        not create another listing for this business and will not contact this number or email
        again.
      </p>
      <form action={handleRemove} className="mt-6 flex flex-col items-start gap-4">
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center rounded-xl bg-red-500 px-6 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
        >
          Yes, remove this listing
        </button>
        <a
          href={`/claim/${token}`}
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          Cancel
        </a>
      </form>
    </Screen>
  )
}

function Screen({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <a href="/" className="text-2xl font-bold text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <h1 className="mt-8 text-xl font-bold text-white">{heading}</h1>
        {children}
      </div>
    </main>
  )
}
