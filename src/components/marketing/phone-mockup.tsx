/** A phone frame showing an example profile. Always labelled as an example. */

function Stars({ n }: { n: number }) {
  return (
    <span aria-hidden className="text-sm tracking-tight">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= n ? 'text-brand-amber' : 'text-gray-300'}>★</span>
      ))}
    </span>
  )
}

function Pill({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'green' | 'amber' | 'navy' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-800',
    navy: 'bg-brand-navy text-white',
  }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>{children}</span>
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-600">
      <span className="w-20 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full bg-brand-amber" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="w-6 text-right font-semibold text-gray-700">{value.toFixed(1)}</span>
    </div>
  )
}

export function PhoneMockup({ variant, className = '' }: { variant: 'trade' | 'client'; className?: string }) {
  return (
    <figure className={`mx-auto w-[260px] ${className}`}>
      <div className="rounded-[2.2rem] border-[7px] border-gray-900 bg-gray-900 shadow-2xl shadow-black/40">
        <div className="overflow-hidden rounded-[1.7rem] bg-gray-50">
          <div className="mx-auto mt-1.5 h-1.5 w-16 rounded-full bg-gray-300" />
          {variant === 'trade' ? (
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-bold text-brand-navy">Example Plastering Ltd</p>
                <p className="text-[11px] text-gray-500">Plasterer · Altrincham, Hale</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Pill tone="green">ID verified</Pill>
                  <Pill tone="amber">Insured to £2m</Pill>
                  <Pill tone="navy">Pro member</Pill>
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-brand-navy">4.8</span>
                  <Stars n={5} />
                </div>
                <p className="mt-1 text-[10px] text-gray-500">34 reviews, each from a job both sides confirmed</p>
                <p className="mt-1 text-[10px] font-semibold text-gray-700">Hired again by 6 clients</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <Stars n={5} />
                  <span className="text-[10px] text-gray-400">Sep 2026</span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-gray-700">Turned up when he said, left the place spotless and finished a day early.</p>
                <p className="mt-1 text-[10px] text-gray-400">Confirmed client</p>
              </div>
              <div className="rounded-xl bg-brand-amber py-2 text-center text-[11px] font-bold text-brand-navy">Log a job with Example Plastering</div>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-bold text-brand-navy">Sam P.</p>
                <p className="text-[11px] text-gray-500">Client · Member since 2026</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Pill tone="green">ID verified</Pill>
                  <Pill>Confirmed 9 of 9 requests</Pill>
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-brand-navy">4.9</span>
                  <Stars n={5} />
                </div>
                <p className="mt-1 text-[10px] text-gray-500">Reviews from trades on confirmed jobs</p>
              </div>
              <div className="space-y-1.5 rounded-xl bg-white p-3 shadow-sm">
                <Bar label="Pays on time" value={4.9} />
                <Bar label="Clear scope" value={4.7} />
                <Bar label="Communication" value={5} />
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <Stars n={5} />
                <p className="mt-1 text-[11px] leading-snug text-gray-700">Paid the day we finished and gave us proper access. Would work for again.</p>
                <p className="mt-1 text-[10px] text-gray-400">Tradesperson · Confirmed by both sides</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[11px] text-white/50">Example profile, not a real business</figcaption>
    </figure>
  )
}
