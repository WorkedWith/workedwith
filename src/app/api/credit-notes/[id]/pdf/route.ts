import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadInvoiceDoc } from '@/lib/invoices/document'
import { canSeeInvoice } from '@/lib/invoices/access'
import { renderCreditNotePdf } from '@/lib/pdf/invoice-pdf'
import type { CreditNote } from '@/types/v42'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: cn } = await admin.from('credit_notes').select('*').eq('id', params.id).maybeSingle()
  if (!cn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const doc = await loadInvoiceDoc(admin, cn.invoice_id)
  if (!doc || !(await canSeeInvoice(admin, user.id, doc.invoice))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const bytes = await (await renderCreditNotePdf(cn as CreditNote, doc)).bytes()
  return new NextResponse(Buffer.from(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${(cn.credit_note_number as string).replace(/\s/g, '-')}.pdf"` },
  })
}
