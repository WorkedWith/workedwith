import { PdfWriter } from './writer'
import { formatPenceExact } from '@/lib/money'
import { formatSortCode } from '@/lib/getting-paid/bank-format'
import { paidLine, type InvoiceDoc } from '@/lib/invoices/document'
import type { CreditNote } from '@/types/v42'

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** Invoice PDF. Meets the HMRC VAT invoice fields when the trade is VAT registered (PRD 11). */
export async function renderInvoicePdf(d: InvoiceDoc, w?: PdfWriter): Promise<PdfWriter> {
  const pdf = w ?? (await PdfWriter.create())
  if (w) pdf.newPage()
  const inv = d.invoice
  const isDeposit = inv.approval_basis === 'deposit'
  pdf.text(d.trade.name, { size: 18, bold: true, color: 'navy' })
  if (d.trade.address) pdf.text(d.trade.address, { color: 'grey' })
  if (d.trade.email) pdf.text(d.trade.email, { color: 'grey' })
  if (d.trade.vatNumber) pdf.text(`VAT number: ${d.trade.vatNumber}`, { color: 'grey' })
  pdf.space(10)
  pdf.text(isDeposit ? `DEPOSIT INVOICE ${inv.invoice_number}` : `INVOICE ${inv.invoice_number}`, { size: 14, bold: true })
  pdf.row('Invoice date (tax point)', date(inv.issued_at))
  pdf.row('Due by', date(inv.due_at))
  pdf.row('Payment reference', inv.invoice_number, { bold: true })
  pdf.space(6)
  pdf.text('Bill to', { bold: true })
  pdf.text(d.client.company ? `${d.client.company}, for the attention of ${d.client.name}` : d.client.name)
  if (d.client.jobAddress) pdf.text(`Job address: ${d.client.jobAddress}`)
  pdf.space(6)
  pdf.text(d.jobTitle, { bold: true })
  if (d.requestedByTrade) pdf.text('Payment requested by the trade. Not approved by the client.', { bold: true })
  pdf.rule()
  for (const l of d.lines) pdf.row(l.description, formatPenceExact(l.amountPence))
  pdf.rule()
  if (inv.vat_pence > 0) {
    pdf.row('Total excluding VAT', formatPenceExact(inv.net_pence))
    pdf.row('VAT at 20%', formatPenceExact(inv.vat_pence))
  }
  pdf.row('Total', formatPenceExact(inv.total_pence), { bold: true, size: 12 })
  const credited = d.credits.reduce((s, c) => s + c.amount_pence, 0)
  if (inv.amount_paid_pence > 0) pdf.row('Paid so far', formatPenceExact(inv.amount_paid_pence))
  if (credited > 0) pdf.row('Credited', formatPenceExact(credited))
  pdf.row('Balance due', formatPenceExact(Math.max(0, inv.total_pence - inv.amount_paid_pence - credited)), { bold: true })
  for (const p of d.payments) pdf.text(`Paid ${formatPenceExact(p.amount_pence)} on ${paidLine(p)}`, { color: 'grey' })
  if (inv.status === 'paid') pdf.stamp(`PAID ${new Date(inv.paid_at ?? inv.issued_at).toLocaleDateString('en-GB')}`)
  pdf.space(10)
  if (d.payee && inv.status !== 'paid') {
    pdf.text('How to pay', { bold: true })
    pdf.text(`Bank transfer to ${d.payee.accountName}, sort code ${formatSortCode(d.payee.sortCode)}, account number ${d.payee.accountNumber}. Use the reference ${inv.invoice_number}.`)
    pdf.text(`View and pay online: ${d.url}`, { color: 'grey' })
  }
  pdf.space(10)
  pdf.text('Sent via WorkedWith. WorkedWith never holds your money: you pay the trade directly.', { size: 8, color: 'grey' })
  return pdf
}

export async function renderCreditNotePdf(cn: CreditNote, d: InvoiceDoc, w?: PdfWriter): Promise<PdfWriter> {
  const pdf = w ?? (await PdfWriter.create())
  if (w) pdf.newPage()
  pdf.text(d.trade.name, { size: 18, bold: true, color: 'navy' })
  if (d.trade.address) pdf.text(d.trade.address, { color: 'grey' })
  if (d.trade.vatNumber) pdf.text(`VAT number: ${d.trade.vatNumber}`, { color: 'grey' })
  pdf.space(10)
  pdf.text(`CREDIT NOTE ${cn.credit_note_number}`, { size: 14, bold: true })
  pdf.row('Date', date(cn.issued_at))
  pdf.row('Against invoice', d.invoice.invoice_number)
  pdf.text(d.client.company ? `${d.client.company}, for the attention of ${d.client.name}` : d.client.name)
  pdf.rule()
  pdf.row(cn.reason, formatPenceExact(cn.amount_pence))
  if (cn.vat_pence > 0) {
    pdf.row('Excluding VAT', formatPenceExact(cn.net_pence))
    pdf.row('VAT at 20%', formatPenceExact(cn.vat_pence))
  }
  pdf.row('Total credited', formatPenceExact(cn.amount_pence), { bold: true })
  pdf.space(10)
  pdf.text('Sent via WorkedWith.', { size: 8, color: 'grey' })
  return pdf
}
