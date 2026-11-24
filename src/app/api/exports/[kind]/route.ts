import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { creditNotesCsv, invoicesCsv, paymentsCsv } from '@/lib/exports/build'
import { loadInvoiceDoc } from '@/lib/invoices/document'
import { renderInvoicePdf } from '@/lib/pdf/invoice-pdf'
import { PdfWriter } from '@/lib/pdf/writer'

export const dynamic = 'force-dynamic'

const DATE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: NextRequest, { params }: { params: { kind: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  const from = req.nextUrl.searchParams.get('from') ?? ''
  const to = req.nextUrl.searchParams.get('to') ?? ''
  if (!DATE.test(from) || !DATE.test(to)) return NextResponse.json({ error: 'Pick a date range' }, { status: 400 })
  const admin = createAdminClient()
  const r = { from, to }
  const name = `workedwith-${params.kind}-${from}-to-${to}`
  const csv = (body: string) => new NextResponse(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` } })

  switch (params.kind) {
    case 'invoices': return csv(await invoicesCsv(admin, user.id, r))
    case 'payments': return csv(await paymentsCsv(admin, user.id, r))
    case 'credit-notes': return csv(await creditNotesCsv(admin, user.id, r))
    case 'invoices-pdf': {
      const { data } = await admin.from('invoices').select('id').eq('trade_id', user.id).gte('issued_at', from).lte('issued_at', `${to}T23:59:59.999Z`).order('sequence').limit(500)
      const parts: Uint8Array[] = []
      for (const row of data ?? []) {
        const doc = await loadInvoiceDoc(admin, row.id as string)
        if (doc) parts.push(await (await renderInvoicePdf(doc)).bytes())
      }
      if (parts.length === 0) {
        const empty = await PdfWriter.create()
        empty.text('No invoices in this period.')
        parts.push(await empty.bytes())
      }
      const bytes = await PdfWriter.merge(parts)
      return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}.pdf"` } })
    }
    default:
      return NextResponse.json({ error: 'Unknown export' }, { status: 404 })
  }
}
