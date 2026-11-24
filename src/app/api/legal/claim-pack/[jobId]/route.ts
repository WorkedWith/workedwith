import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimPackAvailable, renderClaimPack } from '@/lib/legal/claim-pack'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** The claim pack, for the trade only, once the letter's response period has passed (PRD 10). */
export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: job } = await admin.from('jobs').select('trade_user_id').eq('id', params.jobId).maybeSingle()
  if (!job || job.trade_user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await claimPackAvailable(admin, params.jobId))) return NextResponse.json({ error: 'Available once the letter before action response period has passed' }, { status: 400 })
  const bytes = await renderClaimPack(admin, params.jobId)
  if (!bytes) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await admin.from('legal_documents').insert({ job_id: params.jobId, type: 'claim_pack', created_by: user.id })
  return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="claim-pack.pdf"' } })
}
