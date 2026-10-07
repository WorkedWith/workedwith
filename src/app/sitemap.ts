import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE_URL = 'https://workedwith.co.uk'

// Always build fresh so new profiles appear without a redeploy
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/find`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/for-trades`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/for-clients`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const admin = createAdminClient()

    const [{ data: trades }, { data: seeded }] = await Promise.all([
      admin.from('trade_profiles').select('public_slug').not('public_slug', 'is', null),
      admin
        .from('seeded_profiles')
        .select('slug')
        .eq('status', 'unclaimed')
        .gt('expires_at', now.toISOString()),
    ])

    const profilePages: MetadataRoute.Sitemap = [
      ...((trades ?? []) as { public_slug: string }[]).map(t => ({
        url: `${BASE_URL}/t/${t.public_slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
      ...((seeded ?? []) as { slug: string }[]).map(s => ({
        url: `${BASE_URL}/t/${s.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.4,
      })),
    ]

    return [...staticPages, ...profilePages]
  } catch (err) {
    console.error('Sitemap profile lookup failed (non-fatal):', err)
    return staticPages
  }
}
