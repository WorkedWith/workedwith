'use client'

import { useState } from 'react'
import { ClientSearchForm } from './client-search-form'
import { DEMO_CLIENT_PROFILE } from '@/lib/demo-data'

export function SearchDemoWrapper() {
  const [hasSearched, setHasSearched] = useState(false)

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-700 mb-4">
          Enter a client&apos;s email or phone number to look up their WorkedWith profile.
        </p>
        <ClientSearchForm onFirstSearch={() => setHasSearched(true)} />
      </div>

      {!hasSearched && <DemoClientCard />}
    </>
  )
}

function DemoClientCard() {
  const p = DEMO_CLIENT_PROFILE
  const filled = Math.round(p.average_rating)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm relative">
      {/* Example badge */}
      <span className="absolute top-4 right-4 rounded-full bg-brand-amber/20 px-2.5 py-0.5 text-xs font-semibold text-brand-navy">
        Example
      </span>

      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
        Example client profile · What you will see when you look up a client
      </p>

      {/* Name + meta */}
      <div className="flex items-start justify-between gap-3 pr-16">
        <div>
          <p className="text-lg font-bold text-brand-navy">{p.display_name}</p>
          <p className="text-sm text-gray-500">{p.location} · {p.confirmed_jobs} confirmed jobs</p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex text-brand-amber text-base">
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>★</span>
            ))}
          </div>
          <p className="text-xs font-semibold text-brand-navy mt-0.5">{p.average_rating.toFixed(1)}</p>
        </div>
      </div>

      {/* Score rows */}
      <div className="mt-5 space-y-2">
        <ScoreRow label="Payment reliability" score={p.payment_score} />
        <ScoreRow label="Communication" score={p.communication_score} />
        <ScoreRow label="Scope clarity" score={p.scope_clarity_score} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Red flags</span>
          <span className="font-semibold text-green-600">None</span>
        </div>
      </div>

      {/* Review excerpts */}
      <div className="mt-5 space-y-3">
        {p.review_excerpts.map((r, i) => (
          <div key={i} className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-gray-700 italic">&ldquo;{r.excerpt}&rdquo;</p>
            <p className="mt-1 text-xs text-gray-400">— {r.trade_type}, {r.date}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        This is an example profile. Real client profiles are built from verified job records.
      </p>
    </div>
  )
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  const filled = Math.round(score)
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex text-xs">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>★</span>
          ))}
        </div>
        <span className="text-xs font-semibold tabular-nums text-brand-navy w-6 text-right">
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
