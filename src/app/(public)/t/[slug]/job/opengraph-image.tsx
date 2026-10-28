import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatAreas } from '@/lib/format-areas'

export const alt = 'Log a job on WorkedWith'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const admin = createAdminClient()
  const { data: tp } = await admin
    .from('trade_profiles')
    .select('user_id, company_name, trade_types, operating_areas, total_jobs')
    .eq('public_slug', params.slug)
    .maybeSingle()
  let name = 'This business'
  if (tp) {
    const { data: u } = await admin.from('users').select('full_name').eq('id', tp.user_id as string).maybeSingle()
    name = (tp.company_name as string | null) ?? (u?.full_name as string | undefined) ?? name
  }
  const trade = ((tp?.trade_types as string[] | undefined) ?? [])[0] ?? ''
  const area = formatAreas((tp?.operating_areas as string[] | undefined) ?? null)
  const jobs = (tp?.total_jobs as number | undefined) ?? 0

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#0F1F3D', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72 }}>
        <div style={{ color: '#F59E0B', fontSize: 34, fontWeight: 700, display: 'flex' }}>WorkedWith</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, display: 'flex' }}>Had a job done by {name}?</div>
          <div style={{ fontSize: 34, color: '#cbd5e1', marginTop: 24, display: 'flex' }}>
            Log it and you can both leave a review.
          </div>
        </div>
        <div style={{ fontSize: 28, color: '#94a3b8', display: 'flex' }}>
          {[trade, area, jobs > 0 ? `${jobs} confirmed job${jobs === 1 ? '' : 's'}` : ''].filter(Boolean).join('  ·  ')}
        </div>
      </div>
    ),
    { ...size },
  )
}
