import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadInvoiceDoc } from '@/lib/invoices/document'
import { canSeeInvoice } from '@/lib/invoices/access'
import { renderInvoicePdf } from '@/lib/pdf/invoice-pdf'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  const admin = createAdminClient()
  const doc = await loadInvoiceDoc(admin, params.id)
  if (!doc || !(await canSeeInvoice(admin, user.id, doc.invoice))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const bytes = await (await renderInvoicePdf(doc)).bytes()
  return new NextResponse(Buffer.from(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${doc.invoice.invoice_number.replace(/\s/g, '-')}.pdf"` },
  })
}
