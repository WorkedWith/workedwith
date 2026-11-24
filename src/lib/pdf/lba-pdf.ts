import { PdfWriter } from './writer'
import { formatPenceExact } from '@/lib/money'
import { formatSortCode } from '@/lib/getting-paid/bank-format'
import type { LbaData } from '@/lib/legal/lba'

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Letter before action (PRD 10). Person version follows the shape of the Pre Action Protocol for Debt Claims
 * (30 days, information sheet and reply form). Company version allows 14 days and can add statutory interest
 * and compensation. TODO(solicitor): final wording of both versions is part of the solicitor review (PRD 19).
 */
export async function renderLbaPdf(d: LbaData, w?: PdfWriter): Promise<PdfWriter> {
  const pdf = w ?? (await PdfWriter.create())
  if (w) pdf.newPage()
  pdf.text(d.trade.name, { size: 16, bold: true, color: 'navy' })
  if (d.trade.address) pdf.text(d.trade.address, { color: 'grey' })
  if (d.trade.email) pdf.text(d.trade.email, { color: 'grey' })
  pdf.space(8)
  pdf.text(date(d.letterDate))
  pdf.space(6)
  pdf.text(d.client.company ? `${d.client.company}, for the attention of ${d.client.name}` : d.client.name)
  if (d.client.address) pdf.text(d.client.address)
  pdf.space(8)
  pdf.text('LETTER BEFORE ACTION', { size: 13, bold: true })
  pdf.text(`Re: ${d.jobTitle}`, { bold: true })
  pdf.space(4)
  pdf.text(`Dear ${d.client.name},`)
  pdf.text(`You owe ${d.trade.name} ${formatPenceExact(d.principalPence)} for the work on ${d.jobTitle}. Despite reminders, this has not been paid. The details are:`)
  pdf.rule()
  for (const l of d.lines) {
    pdf.row(`Invoice ${l.invoiceNumber}, issued ${date(l.issuedAt)}, due ${date(l.dueAt)}: ${l.description}${l.requestedByTrade ? ' (payment requested by the trade, not approved by the client)' : ''}`, formatPenceExact(l.balancePence))
  }
  if (d.includeInterest) {
    pdf.row(`Statutory interest at ${d.referenceRate + 8}% a year under the Late Payment of Commercial Debts (Interest) Act 1998, to the date of this letter`, formatPenceExact(d.interestPence))
    pdf.row('Fixed sum compensation under the same Act', formatPenceExact(d.compensationPence))
  }
  pdf.rule()
  pdf.row('Total now owed', formatPenceExact(d.totalPence), { bold: true })
  if (d.includeInterest) pdf.text('Interest continues to run at the same daily rate until payment.', { color: 'grey' })
  pdf.space(6)
  pdf.text(`Please pay the total, or reply, by ${date(d.respondBy)} (${d.responseDays} days from the date of this letter).`, { bold: true })
  if (d.payee) pdf.text(`Pay by bank transfer to ${d.payee.accountName}, sort code ${formatSortCode(d.payee.sortCode)}, account number ${d.payee.accountNumber}, using the invoice number as the reference.`)
  pdf.text(`The accepted quote, your approvals, invoices and the reminders sent are available as copies on request${d.trade.email ? ` from ${d.trade.email}` : ''}.`)
  if (d.version === 'person') {
    pdf.text('Please read the enclosed information sheet and use the reply form to tell us whether you agree you owe the money, want to pay in instalments, or dispute it. If you dispute it, please explain why and send any documents you rely on.')
    pdf.text('If you are in financial difficulty you may wish to get free advice, for example from Citizens Advice, StepChange or National Debtline.')
  } else {
    pdf.text('If you dispute this debt, please explain why in writing before the date above.')
  }
  pdf.text(`If we do not hear from you by ${date(d.respondBy)}, ${d.trade.name} may start court proceedings to recover the money, which could add to the costs you have to pay.`)
  pdf.space(6)
  pdf.text('Yours sincerely,')
  pdf.text(d.trade.name, { bold: true })
  pdf.space(6)
  pdf.text('Sent through WorkedWith on behalf of the trade. WorkedWith does not collect debts or act for either party.', { size: 8, color: 'grey' })

  if (d.version === 'person') {
    pdf.newPage()
    pdf.text('INFORMATION SHEET', { size: 13, bold: true })
    pdf.text('You have been sent this letter because the business believes you owe them money. You have 30 days from the date of the letter to reply.')
    pdf.text('What you should do:')
    pdf.text('1. Read the letter and check whether you agree you owe the money.', { indent: 10 })
    pdf.text('2. Fill in the reply form. Say if you agree, agree in part, or dispute the debt, and why.', { indent: 10 })
    pdf.text('3. If you need time to get advice, say so on the form. The business should allow you reasonable time.', { indent: 10 })
    pdf.text('4. If you agree you owe the money but cannot pay it all at once, you can offer to pay in instalments.', { indent: 10 })
    pdf.text('Free, independent debt advice is available from Citizens Advice, StepChange Debt Charity and National Debtline.')
    pdf.text('If you do not reply within 30 days, the business may start court proceedings against you.')
    pdf.newPage()
    pdf.text('REPLY FORM', { size: 13, bold: true })
    pdf.text(`To ${d.trade.name}${d.trade.email ? `, ${d.trade.email}` : ''}`)
    pdf.text(`About: ${d.jobTitle}. Amount claimed: ${formatPenceExact(d.totalPence)}`)
    pdf.space(6)
    for (const opt of ['I agree I owe the full amount', 'I agree I owe part of the amount: £ ............', 'I do not owe any of the amount', 'I need more time to get advice. I have asked for advice from: ............', 'I want to pay in instalments of £ ............ each month', 'I enclose documents I rely on']) {
      pdf.text(`[  ]  ${opt}`)
    }
    pdf.space(6)
    pdf.text('Why I dispute the debt, if I do:')
    pdf.space(60)
    pdf.text('Name: ............................................   Signed: ............................   Date: ................')
  }
  return pdf
}
