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
    a: 'Go to the Find a tradesperson page, select a trade type, enter your postcode and choose a radius. Results show verified tradespeople with genuine mutual reviews.',
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

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight text-brand-navy">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/sign-in" className="min-h-[44px] flex items-center px-3 text-sm font-medium text-gray-600 hover:text-brand-navy transition-colors">
              Sign in
            </a>
            <a href="/join" className="min-h-[44px] flex items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors">
              Join free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="bg-brand-navy px-4 py-16 sm:py-20 sm:px-6 text-center">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/60 leading-relaxed">
          Everything you need to know about WorkedWith.
        </p>
      </header>

      {/* ── Accordion ────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:py-20 sm:px-6">
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {FAQS.map(({ q, a }) => (
            <AccordionItem key={q} question={q} answer={a} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">
            Still have questions?{' '}
            <a href="mailto:hello@workedwith.co.uk" className="font-medium text-brand-amber hover:underline">
              hello@workedwith.co.uk
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-brand-navy px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-bold text-white">Worked<span className="text-brand-amber">With</span></p>
            <p className="mt-1 text-sm text-white/40">Know who you are working with.</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/find" className="text-sm text-white/50 hover:text-white transition-colors">Find a tradesperson</a>
            <a href="/pricing" className="text-sm text-white/50 hover:text-white transition-colors">Pricing</a>
            <a href="/join/trade" className="text-sm text-white/50 hover:text-white transition-colors">Join as Trade</a>
            <a href="/join/client" className="text-sm text-white/50 hover:text-white transition-colors">Join as Client</a>
            <a href="/sign-in" className="text-sm text-white/50 hover:text-white transition-colors">Sign in</a>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-xs text-white/30">
          &copy; {new Date().getFullYear()} WorkedWith. All rights reserved. Registered in England &amp; Wales.
        </p>
      </footer>
    </div>
  )
}

// ── Accordion item ────────────────────────────────────────────

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
