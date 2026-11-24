import { formatPenceExact } from '@/lib/money'
import { formatSortCode } from '@/lib/getting-paid/bank-format'
import { paidLine, type InvoiceDoc } from '@/lib/invoices/document'
import { CopyRow } from '@/components/copy-button'
import { Pill } from '@/components/ui'

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** The invoice on screen, phone first. Same content as the PDF. */
export function InvoiceView({ d, showPay }: { d: InvoiceDoc; showPay: boolean }) {
  const inv = d.invoice
  const credited = d.credits.reduce((s, c) => s + c.amount_pence, 0)
  const balance = Math.max(0, inv.total_pence - inv.amount_paid_pence - credited)
  return (
    <article className="space-y-4">
      <header className="rounded-2xl bg-brand-navy p-5 text-white">
        <p className="text-sm text-white/70">{d.trade.name}</p>
        <h1 className="mt-1 text-xl font-bold">{inv.approval_basis === 'deposit' ? 'Deposit invoice' : 'Invoice'} {inv.invoice_number}</h1>
        <p className="mt-3 text-3xl font-bold tabular-nums">{formatPenceExact(balance)}</p>
        <p className="text-sm text-white/80">{balance === 0 ? (inv.status === 'credited' ? 'Credited' : `Paid ${inv.paid_at ? date(inv.paid_at) : ''}`) : `Due by ${date(inv.due_at)}`}</p>
      </header>

      {d.requestedByTrade && <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">Payment requested by the trade. Not approved by the client.</p>}

      {showPay && balance > 0 && d.payee && (
        <section className="rounded-2xl border-2 border-brand-amber bg-white px-5 py-3">
          <p className="pt-2 text-sm font-semibold text-brand-navy">Pay by bank transfer</p>
          <div className="divide-y divide-gray-100">
            <CopyRow label="Account name" value={d.payee.accountName} />
            <CopyRow label="Sort code" value={d.payee.sortCode} display={formatSortCode(d.payee.sortCode)} />
            <CopyRow label="Account number" value={d.payee.accountNumber} />
            <CopyRow label="Reference (please use this)" value={inv.invoice_number} />
            <CopyRow label="Amount" value={(balance / 100).toFixed(2)} display={formatPenceExact(balance)} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="text-gray-500">Bill to</p>
            <p className="font-medium">{d.client.company ? `${d.client.company} (${d.client.name})` : d.client.name}</p>
            {d.client.jobAddress && <p className="text-gray-600">{d.client.jobAddress}</p>}
          </div>
          <div className="text-right">
            <p className="text-gray-500">Issued</p>
            <p>{date(inv.issued_at)}</p>
            <Pill tone={inv.status === 'paid' ? 'green' : inv.status === 'credited' ? 'grey' : 'amber'}>{inv.status === 'part_paid' ? 'Part paid' : inv.status === 'issued' ? 'Unpaid' : inv.status === 'paid' ? 'Paid' : 'Credited'}</Pill>
          </div>
        </div>
        <p className="mt-4 font-semibold">{d.jobTitle}</p>
        <ul className="mt-2 divide-y divide-gray-100">
          {d.lines.map((l, i) => <li key={i} className="flex justify-between gap-3 py-2"><span>{l.description}</span><span className="tabular-nums">{formatPenceExact(l.amountPence)}</span></li>)}
        </ul>
        <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
          {inv.vat_pence > 0 && <div className="flex justify-between text-gray-600"><span>Excluding VAT</span><span className="tabular-nums">{formatPenceExact(inv.net_pence)}</span></div>}
          {inv.vat_pence > 0 && <div className="flex justify-between text-gray-600"><span>VAT at 20%</span><span className="tabular-nums">{formatPenceExact(inv.vat_pence)}</span></div>}
          <div className="flex justify-between font-bold"><span>Total</span><span className="tabular-nums">{formatPenceExact(inv.total_pence)}</span></div>
          {d.payments.map(p => <div key={p.id} className="flex justify-between text-gray-600"><span>Paid {paidLine(p)}</span><span className="tabular-nums">{formatPenceExact(p.amount_pence)}</span></div>)}
          {d.credits.map(c => <div key={c.id} className="flex justify-between text-gray-600"><span>Credit note {c.credit_note_number}</span><span className="tabular-nums">{formatPenceExact(c.amount_pence)}</span></div>)}
        </div>
        {d.trade.vatNumber && <p className="mt-3 text-xs text-gray-500">VAT number {d.trade.vatNumber}</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/invoices/${inv.id}/pdf`} className="inline-flex min-h-[48px] items-center rounded-xl border-2 border-brand-navy px-5 text-sm font-semibold text-brand-navy">Download PDF</a>
        {d.credits.map(c => <a key={c.id} href={`/api/credit-notes/${c.id}/pdf`} className="inline-flex min-h-[48px] items-center rounded-xl px-3 text-sm font-semibold text-brand-navy underline">Credit note {c.credit_note_number}</a>)}
      </div>
    </article>
  )
}
