export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { removeSeededProfile } from '@/actions/remove-seeded-profile'
import type { SeededProfile } from '@/types/database'

type Props = { params: Promise<{ token: string }> }

export default async function RemoveSeededProfilePage({ params }: Props) {
  const { token } = await params

  // Check the profile exists before removing
  const admin = createAdminClient()
  const { data: raw } = await admin
    .from('seeded_profiles')
    .select('business_name, status')
    .eq('claim_token', token)
    .maybeSingle()

  const profile = raw as Pick<SeededProfile, 'business_name' | 'status'> | null

  if (!profile) {
    return <Confirm heading="Already removed" body="This listing no longer exists." />
  }

  if (profile.status === 'claimed') {
    return (
      <Confirm
        heading="Listing already claimed"
        body="This listing has been claimed by the business owner and cannot be removed via this link."
      />
    )
  }

  if (profile.status === 'removed') {
    return <Confirm heading="Already removed" body="This listing has already been removed." />
  }

  // Execute the removal
  await removeSeededProfile(token)

  return (
    <Confirm
      heading="Listing removed"
      body={`The listing for ${profile.business_name} has been deleted. We will not create another listing for this business and will not contact this number or email again.`}
    />
  )
}

function Confirm({ heading, body }: { heading: string; body: string }) {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <a href="/" className="text-2xl font-bold text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <h1 className="mt-8 text-xl font-bold text-white">{heading}</h1>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">{body}</p>
        <a
          href="/"
          className="mt-8 inline-block text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          Back to WorkedWith
        </a>
      </div>
    </main>
  )
}
