import { APP_URL } from '@/lib/app-url'

/**
 * "Invite your trade to WorkedWith" (decision 8): opens the client's own email app with a short note.
 * No review is attached and nothing is sent by WorkedWith.
 */
export function InviteYourTradeLink({ className, label = 'Invite your trade to WorkedWith' }: { className?: string; label?: string }) {
  const subject = 'Have you seen WorkedWith?'
  const body = [
    'Hi,',
    '',
    'I use WorkedWith to find trades and keep track of jobs. Quotes, approvals and invoices are all in one place, and clients pay by bank transfer with no fees.',
    '',
    `It is £19.99 a month for trades after a 30 day free trial: ${APP_URL}/for-trades`,
    '',
    'Thanks',
  ].join('\n')
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return (
    <a href={href} className={className ?? 'inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400'}>
      {label}
    </a>
  )
}
