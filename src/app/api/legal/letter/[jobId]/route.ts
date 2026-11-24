import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildLbaData } from '@/lib/legal/lba'
import { renderLbaPdf } from '@/lib/pdf/lba-pdf'

export const dynamic = 'force-dynamic'

/** Preview of the letter before action, for the trade only. */
export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: job } = await admin.from('jobs').select('trade_user_id').eq('id', params.jobId).maybeSingle()
  if (!job || job.trade_user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const d = await buildLbaData(admin, params.jobId, { includeInterest: req.nextUrl.searchParams.get('interest') === '1' })
  if (!d) return NextResponse.json({ error: 'Nothing is 21 days overdue on this job' }, { status: 400 })
  const bytes = await (await renderLbaPdf(d)).bytes()
  return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="letter-before-action-preview.pdf"' } })
}
