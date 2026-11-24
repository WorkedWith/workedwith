'use client'

import { useState } from 'react'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is WorkedWith?',
    a: 'The UK directory of trades where every review comes from a real, paid job, and where clients have a reputation too. Trades run their jobs through WorkedWith: they quote, the client accepts, extras are approved before the work, and the client pays by bank transfer.',
  },
  {
    q: 'How much does it cost?',
    a: 'Trades pay £19.99 a month after a 30 day free trial, with no card needed to start. That is the only cost from WorkedWith. There are no transaction fees on bank payments. Clients never pay anything.',
  },
  {
    q: 'Are there any other fees?',
    a: "No transaction fees, ever. Connecting your bank is free because WorkedWith pays for it. The only other possible cost is Stripe's card fee if you choose to switch card payments on, charged by Stripe directly. Boosted Districts are an optional extra at £10 a month per district.",
  },
  {
    q: 'Does WorkedWith hold my money?',
    a: 'Never. Clients pay straight into your own bank account using the details and reference on the invoice. Optional card payments go to your own Stripe account.',
  },
  {
    q: 'What does connecting my bank do?',
    a: 'It lets WorkedWith see incoming bank transfers so your invoices mark themselves paid. It reads incoming payments only and can never move money. We only store payments that match one of your invoices. It is optional: you can always mark payments yourself.',
  },
  {
    q: 'How do reviews work?',
    a: 'Reviews only open once a job is paid, a due payment is 30 days overdue, or a job is cancelled after work started. Both sides then have 14 days. Neither review shows until both are in or the 14 days end, then they publish together.',
  },
  {
    q: 'Can I add jobs I did before joining?',
    a: 'No. Every review comes from a job that ran through WorkedWith, so reviews can always be trusted.',
  },
  {
    q: 'How do clients approve things?',
    a: 'Only from their own signed in account, using a text code. Quotes, extras, start dates and stages are never approved by default or by the trade, so there is always a clear record of the client agreeing.',
  },
  {
    q: 'What if a client never responds?',
    a: 'Stages waiting for approval get automatic reminders to the client at day 5, 10 and 14. After that you can request payment anyway. It is always labelled as not approved by the client.',
  },
  {
    q: "Who can see a client's record?",
    a: 'Only trades quoting that client, or looking them up by their exact email address or mobile number. Client records are never public and never searchable by name.',
  },
  {
    q: 'Does WorkedWith chase payments for me?',
    a: "Yes. Reminders go out automatically in your business's name before and after the due date. WorkedWith never collects debts or files claims, but it prepares a letter before action and a claim pack you can use yourself.",
  },
  {
    q: 'Which accounting software do you work with?',
    a: 'Xero, QuickBooks, FreeAgent and Sage. The sync is optional and one way: we send invoices, payments and credit notes, and never read or change anything else. A CSV export is always available.',
  },
  {
    q: 'How do I find a trade?',
    a: 'Go to Find a trade, pick the trade and enter your postcode. Results are ranked on reviews from paid jobs. Boosted trades pay to appear first and are always labelled. Tap Email now to ask for a quote.',
  },
  {
    q: 'Is there an app?',
    a: 'No app to download. WorkedWith works in any browser on your phone, tablet or computer.',
  },
]

export function FaqAccordion() {
  return (
    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {FAQS.map(({ q, a }) => (
        <AccordionItem key={q} question={q} answer={a} />
      ))}
    </div>
  )
}

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`text-sm font-semibold leading-snug sm:text-base ${open ? 'text-brand-navy' : 'text-gray-800'}`}>
          {question}
        </span>
        <span
          aria-hidden
          className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
            open ? 'bg-brand-amber text-brand-navy' : 'bg-gray-100 text-gray-400'
          }`}
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm leading-relaxed text-gray-500">{answer}</p>
        </div>
      )}
    </div>
  )
}
