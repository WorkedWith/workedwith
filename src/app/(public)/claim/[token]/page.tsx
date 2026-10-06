import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClaimForm } from './claim-form'
import type { SeededProfile } from '@/types/database'

type Props = { params: Promise<{ token: string }> }

export const metadata: Metadata = {
  title: 'Claim your listing | WorkedWith',
  robots: { index: false },
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const masked = local.length <= 2 ? `${local[0]}*` : `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
  return `${masked}@${domain}`
}

export default async function ClaimTokenPage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: raw } = await admin
    .from('seeded_profiles')
    .select('*')
    .eq('claim_token', token)
    .maybeSingle()

  if (!raw) notFound()

  const profile = raw as unknown as SeededProfile

  if (profile.status === 'removed') {
    return (
      <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <span className="text-2xl font-bold text-white">Worked<span className="text-brand-amber">With</span></span>
          <h1 className="mt-8 text-xl font-bold text-white">Listing removed</h1>
          <p className="mt-3 text-sm text-white/60">This listing has already been removed.</p>
        </div>
      </main>
    )
  }

  if (profile.status === 'claimed') {
    return (
      <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <span className="text-2xl font-bold text-white">Worked<span className="text-brand-amber">With</span></span>
          <h1 className="mt-8 text-xl font-bold text-white">Already claimed</h1>
          <p className="mt-3 text-sm text-white/60">
            This listing has already been claimed.{' '}
            <a href={`/t/${profile.slug}`} className="text-brand-amber hover:underline">
              View the profile
            </a>
          </p>
        </div>
      </main>
    )
  }

  if (new Date(profile.expires_at) < new Date()) {
    return (
      <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <span className="text-2xl font-bold text-white">Worked<span className="text-brand-amber">With</span></span>
          <h1 className="mt-8 text-xl font-bold text-white">This invite has expired</h1>
          <p className="mt-3 text-sm text-white/60">
            This link was valid for 60 days and has now expired. Contact{' '}
            <a href="mailto:hello@workedwith.co.uk" className="text-brand-amber hover:underline">
              hello@workedwith.co.uk
            </a>{' '}
            if you would like to claim your listing.
          </p>
        </div>
      </main>
    )
  }

  const contactEmailMasked = profile.contact_email ? maskEmail(profile.contact_email) : null

  return (
    <main className="min-h-screen bg-brand-navy">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">

        {/* Wordmark */}
        <a href="/" className="text-2xl font-bold text-white">
          Worked<span className="text-brand-amber">With</span>
        </a>

        {/* Profile summary card */}
        <div className="mt-8 rounded-2xl bg-white/10 ring-1 ring-white/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
            Listing on WorkedWith
          </p>
          <h1 className="text-2xl font-bold text-white">{profile.business_name}</h1>
          <p className="mt-1 text-sm text-white/60">{profile.trade_category}</p>
          {profile.operating_areas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.operating_areas.map(a => (
                <span key={a} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                  {a}
                </span>
              ))}
            </div>
          )}
          <a
            href={`/t/${profile.slug}`}
            className="mt-4 inline-block text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            View public page /t/{profile.slug}
          </a>
        </div>

        {/* Claim / remove form */}
        <div className="mt-6">
          <ClaimForm
            claimToken={token}
            businessName={profile.business_name}
            contactPhone={profile.contact_phone}
            contactEmailMasked={contactEmailMasked}
          />
        </div>

      </div>
    </main>
  )
}
