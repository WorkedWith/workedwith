import { formatAreas } from '@/lib/format-areas'
import { APP_URL } from '@/lib/app-url'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SeededProfile } from '@/types/database'
import { TradeProfileView } from './profile-view'

type Props = { params: Promise<{ slug: string }> }

// ── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('public_slug', slug)
    .maybeSingle()

  if (profile) {
    const { data: user } = await admin
      .from('users')
      .select('full_name')
      .eq('id', profile.user_id)
      .single()

    const tradeTypes = profile.trade_types as string[]
    const displayName = (profile.company_name as string | null) ?? (user?.full_name as string | undefined) ?? 'Tradesperson'
    const tradesLabel = tradeTypes.length > 0 ? tradeTypes.join(', ') : 'Tradesperson'
    const reviewsText =
      (profile.total_reviews as number) > 0
        ? `${profile.total_reviews} verified reviews on WorkedWith.`
        : 'New to WorkedWith.'

    const title = `${displayName}, ${tradesLabel} | WorkedWith`
    const areasText = formatAreas(profile.operating_areas as string[] | null)
    const description = `${displayName} is a verified ${tradesLabel}${areasText ? `. ${areasText}` : ''}. ${reviewsText}`
    const canonical = `${APP_URL}/t/${slug}`

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, siteName: 'WorkedWith', type: 'profile' },
    }
  }

  // Fallback: check seeded profiles
  const { data: seeded } = await admin
    .from('seeded_profiles')
    .select('business_name, trade_category')
    .eq('slug', slug)
    .eq('status', 'unclaimed')
    .maybeSingle()

  if (seeded) {
    const sp = seeded as unknown as Pick<SeededProfile, 'business_name' | 'trade_category'>
    const title = `${sp.business_name}, ${sp.trade_category} | WorkedWith`
    const description = `${sp.business_name} is a ${sp.trade_category} with a listing on WorkedWith. This profile has not yet been claimed.`
    const canonical = `${APP_URL}/t/${slug}`
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, siteName: 'WorkedWith', type: 'profile' },
    }
  }

  return { title: 'Profile not found | WorkedWith' }
}

// ── Seeded profile page ───────────────────────────────────────

export default async function TradeProfilePage({ params }: Props) {
  const { slug } = await params
  return <TradeProfileView slug={slug} />
}
