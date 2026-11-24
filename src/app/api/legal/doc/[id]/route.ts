import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderLbaPdf } from '@/lib/pdf/lba-pdf'
import type { LbaData } from '@/lib/legal/lba'

export const dynamic = 'force-dynamic'

/** A sent letter, exactly as sent (from the saved figures). The trade and the client can read it. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: doc } = await admin.from('legal_documents').select('*').eq('id', params.id).eq('type', 'letter_before_action').maybeSingle()
  if (!doc?.sent_at || !doc.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: job } = await admin.from('jobs').select('trade_user_id, client_user_id').eq('id', doc.job_id).maybeSingle()
  if (!job || (job.trade_user_id !== user.id && job.client_user_id !== user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const bytes = await (await renderLbaPdf(doc.data as unknown as LbaData)).bytes()
  return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="letter-before-action.pdf"' } })
}
