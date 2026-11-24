/**
 * Late Payment of Commercial Debts (Interest) Act 1998, company clients only (PRD 10). Statutory interest is
 * the Bank of England reference rate plus 8%, simple, per year. The reference rate is the base rate on 30 June
 * or 31 December before the debt fell due. TODO(Adam): set LATE_PAYMENT_REFERENCE_RATE to the current
 * reference rate; the default below is only a placeholder.
 */
export function referenceRatePercent(): number {
  const v = Number(process.env.LATE_PAYMENT_REFERENCE_RATE)
  return Number.isFinite(v) && v >= 0 ? v : 4
}

export function statutoryInterestPence(balancePence: number, dueAt: Date, asOf: Date): number {
  const days = Math.max(0, Math.floor((asOf.getTime() - dueAt.getTime()) / 86_400_000))
  const rate = (referenceRatePercent() + 8) / 100
  return Math.round((balancePence * rate * days) / 365)
}

/** Fixed sum compensation per invoice: £40 under £1,000, £70 under £10,000, £100 from £10,000. */
export function fixedCompensationPence(invoiceTotalPence: number): number {
  if (invoiceTotalPence < 100_000) return 4_000
  if (invoiceTotalPence < 1_000_000) return 7_000
  return 10_000
}
