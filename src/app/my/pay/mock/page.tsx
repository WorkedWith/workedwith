import { notFound } from 'next/navigation'
import { cardsMode } from '@/lib/cards/mode'
import { formatPenceExact } from '@/lib/money'
import { MockPay } from './mock-pay'

export const metadata = { title: 'Test card payment | WorkedWith' }

/** Pretend Stripe Checkout for CARDS_MODE=mock. */
export default function MockPayPage({ searchParams }: { searchParams: { stage?: string; amount?: string } }) {
  const amount = Number(searchParams.amount)
  if (cardsMode() !== 'mock' || !searchParams.stage || !Number.isFinite(amount) || amount <= 0) notFound()
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Test mode. No card is charged.</p>
      <h1 className="text-2xl font-bold text-brand-navy">Pay {formatPenceExact(amount)}</h1>
      <MockPay stageId={searchParams.stage} amountPence={amount} label={formatPenceExact(amount)} />
    </main>
  )
}
