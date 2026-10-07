'use client'

import { useState } from 'react'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do reviews work?',
    a: 'Both the tradesperson and the client submit their reviews privately. Neither can see what the other has written. Reviews go live after a short window. If one party does not submit, the other\'s review still publishes.',
  },
  {
    q: 'Is WorkedWith free to join?',
    a: 'Yes. The free tier is unlimited. You can log jobs, receive reviews and build your profile at no cost. Pro is £9.99 per month and unlocks full client profiles on lookup and visibility in search results.',
  },
  {
    q: 'Do clients pay anything?',
    a: 'Never. Client accounts are permanently free on WorkedWith.',
  },
  {
    q: 'How do I find a tradesperson?',
    a: 'Go to the Find a tradesperson page, select a trade type, and enter your postcode. We match you with tradespeople who cover your postcode district. Results show verified tradespeople with genuine mutual reviews.',
  },
  {
    q: 'What is a verified review?',
    a: 'A review is verified when both the tradesperson and the client have confirmed the job took place and both have submitted their reviews independently.',
  },
  {
    q: 'Can I add jobs I completed before joining?',
    a: 'Yes. Use the Add a past job feature to log historical work and invite the other party to confirm it. This lets you build your profile from day one.',
  },
  {
    q: 'What is the Pro tier?',
    a: 'Pro is £9.99 per month. It unlocks the full client profile on lookup including payment reliability scores, red flag history and written review excerpts from other tradespeople. It also makes your profile appear in client search results.',
  },
  {
    q: 'What happens if someone leaves an unfair review?',
    a: 'You can raise a dispute within 14 days of a review publishing. WorkedWith admin will review both sides and make a decision within 21 days. The review remains visible but is labelled as under dispute during that time.',
  },
  {
    q: 'Is WorkedWith only for the UK?',
    a: 'Yes. WorkedWith is built specifically for the UK trades market.',
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
