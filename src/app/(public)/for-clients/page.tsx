import type { Metadata } from 'next'
import { TRADE_TYPES } from '@/lib/trade-types'
import { DemoProfileCard } from '@/components/demo/demo-profile-card'
import { SampleReviewCard } from '@/components/demo/sample-review-card'
import { DEMO_TRADE_PROFILES, DEMO_TRADESPERSON_REVIEWS } from '@/lib/demo-data'

export const metadata: Metadata = {
  title: 'Find a Tradesperson — WorkedWith',
  description: 'Find verified tradespeople in your area with genuine mutual reviews from real jobs.',
}

const TRUST_PILLS = [
  'Verified reviews',
  'Mutual accountability',
  'Free to use',
  'UK trades only',
  'No hidden fees',
  'Genuine past jobs',
]

export default function ForClientsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight text-brand-navy">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/for-trades"
              className="hidden sm:flex min-h-[44px] items-center px-3 text-sm font-medium text-gray-600 hover:text-brand-navy transition-colors"
            >
              For tradespeople
            </a>
            <a
              href="/sign-in"
              className="hidden sm:flex min-h-[44px] items-center px-3 text-sm font-medium text-gray-600 hover:text-brand-navy transition-colors"
            >
              Sign in
            </a>
            <a
              href="/join/client/individual"
              className="min-h-[44px] flex items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Join free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-brand-navy overflow-hidden px-4 pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-44 lg:pb-20 sm:px-6">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" fillOpacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl text-balance">
            Find a tradesperson{' '}
            <span style={{ textDecoration: 'underline', textDecorationColor: '#F59E0B', textUnderlineOffset: '6px' }}>
              you can actually trust.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/70 text-balance">
            Every review on WorkedWith is verified and mutual. Tradespeople review clients too — so only the best trades want to work with the best clients.
          </p>

          {/* Search bar */}
          <div className="mt-12 mx-auto max-w-3xl w-full rounded-2xl bg-white/10 backdrop-blur-sm p-5 shadow-xl ring-1 ring-white/20">
            <form method="GET" action="/find" className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-center">
              <select
                name="trade"
                required
                className="h-12 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-brand-navy focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
              >
                <option value="" disabled>Select a trade type</option>
                {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                name="postcode"
                type="text"
                required
                placeholder="Postcode"
                autoComplete="postal-code"
                className="h-12 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber uppercase"
              />
              <select
                name="radius"
                defaultValue="10"
                className="h-12 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-brand-navy focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
              >
                <option value="5">5 miles</option>
                <option value="10">10 miles</option>
                <option value="25">25 miles</option>
                <option value="50">50 miles</option>
              </select>
              <button
                type="submit"
                className="h-12 w-full rounded-lg bg-brand-amber px-6 text-sm font-bold text-brand-navy whitespace-nowrap hover:bg-amber-400 transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-white/20" />
            <span className="text-sm text-white/40">or</span>
            <div className="h-px w-12 bg-white/20" />
          </div>
          <a
            href="/join/client/individual"
            className="mt-4 inline-block text-sm font-medium text-brand-amber hover:underline"
          >
            Join free to see full profiles and contact tradespeople →
          </a>
        </div>
      </section>

      {/* ── Trust pills bar ───────────────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-100 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
            Trusted by homeowners across the UK
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRUST_PILLS.map(pill => (
              <span key={pill} className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="bg-gray-50 px-4 pt-20 pb-16 sm:pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-amber">
            How it works
          </h2>
          <p className="mt-4 text-center text-3xl font-bold text-brand-navy sm:text-4xl">
            Three steps to a tradesperson you can trust.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            <StepCard
              number="01"
              icon={<SearchIcon />}
              title="Search for a tradesperson"
              body="Find verified trades in your area by trade type and postcode. Every profile is built from real confirmed jobs."
            />
            <StepCard
              number="02"
              icon={<StarIcon />}
              title="Check their verified reviews"
              body="Every review is linked to a confirmed real job. No fake five-stars. No anonymous complaints."
            />
            <StepCard
              number="03"
              icon={<HandshakeIcon />}
              title="Hire with confidence"
              body="Both you and the tradesperson build a reputation. Everyone shows up properly."
            />
          </div>
        </div>
      </section>

      {/* ── What tradespeople say about clients ───────────────── */}
      <section className="bg-white px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-brand-navy sm:text-4xl">
            What tradespeople say about their clients
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-gray-500">
            On WorkedWith, clients build a reputation too. Here is what verified client reviews look like.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <SampleReviewCard
              jobTitle={DEMO_TRADESPERSON_REVIEWS[0].job_title}
              reviewerLabel={DEMO_TRADESPERSON_REVIEWS[0].reviewer_label}
              subjectDisplay={DEMO_TRADESPERSON_REVIEWS[0].client_display}
              tradeType={DEMO_TRADESPERSON_REVIEWS[0].trade_type}
              overallRating={DEMO_TRADESPERSON_REVIEWS[0].overall_rating}
              scores={[
                { label: 'Payment', value: DEMO_TRADESPERSON_REVIEWS[0].payment_score },
                { label: 'Communication', value: DEMO_TRADESPERSON_REVIEWS[0].communication_score },
                { label: 'Scope clarity', value: DEMO_TRADESPERSON_REVIEWS[0].scope_clarity_score },
              ]}
              writtenReview={DEMO_TRADESPERSON_REVIEWS[0].written_review}
              date={DEMO_TRADESPERSON_REVIEWS[0].date}
            />
            <SampleReviewCard
              jobTitle={DEMO_TRADESPERSON_REVIEWS[1].job_title}
              reviewerLabel={DEMO_TRADESPERSON_REVIEWS[1].reviewer_label}
              subjectDisplay={DEMO_TRADESPERSON_REVIEWS[1].client_display}
              tradeType={DEMO_TRADESPERSON_REVIEWS[1].trade_type}
              overallRating={DEMO_TRADESPERSON_REVIEWS[1].overall_rating}
              scores={[
                { label: 'Payment', value: DEMO_TRADESPERSON_REVIEWS[1].payment_score },
                { label: 'Communication', value: DEMO_TRADESPERSON_REVIEWS[1].communication_score },
                { label: 'Scope clarity', value: DEMO_TRADESPERSON_REVIEWS[1].scope_clarity_score },
              ]}
              writtenReview={DEMO_TRADESPERSON_REVIEWS[1].written_review}
              date={DEMO_TRADESPERSON_REVIEWS[1].date}
            />
            <SampleReviewCard
              jobTitle={DEMO_TRADESPERSON_REVIEWS[2].job_title}
              reviewerLabel={DEMO_TRADESPERSON_REVIEWS[2].reviewer_label}
              subjectDisplay={DEMO_TRADESPERSON_REVIEWS[2].client_display}
              tradeType={DEMO_TRADESPERSON_REVIEWS[2].trade_type}
              overallRating={DEMO_TRADESPERSON_REVIEWS[2].overall_rating}
              scores={[
                { label: 'Payment', value: DEMO_TRADESPERSON_REVIEWS[2].payment_score },
                { label: 'Communication', value: DEMO_TRADESPERSON_REVIEWS[2].communication_score },
                { label: 'Scope clarity', value: DEMO_TRADESPERSON_REVIEWS[2].scope_clarity_score },
              ]}
              writtenReview={DEMO_TRADESPERSON_REVIEWS[2].written_review}
              date={DEMO_TRADESPERSON_REVIEWS[2].date}
            />
          </div>
        </div>
      </section>

      {/* ── Demo profile cards ────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-brand-navy sm:text-4xl">
            What WorkedWith profiles look like
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-gray-500">
            Every tradesperson on WorkedWith has a verified profile built from real confirmed jobs.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {DEMO_TRADE_PROFILES.map(profile => (
              <DemoProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href="/find"
              className="inline-flex min-h-[52px] items-center rounded-xl bg-brand-amber px-8 text-base font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Find tradespeople in your area
            </a>
          </div>
        </div>
      </section>

      {/* ── Why clients use WorkedWith ────────────────────────── */}
      <section className="px-4 py-20 sm:py-24 sm:px-6" style={{ backgroundColor: '#F3F4F6' }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-amber mb-12">
            Why clients use WorkedWith
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <TrustCard
              icon={<ShieldIcon />}
              title="Verified reviews"
              body="Every review is linked to a confirmed job. No anonymous complaints, no fake five stars."
            />
            <TrustCard
              icon={<FreeIcon />}
              title="Free forever"
              body="Searching and contacting tradespeople is always free for clients. No subscriptions, no hidden fees."
            />
            <TrustCard
              icon={<StarIcon />}
              title="Your reputation matters too"
              body="Tradespeople can see how you treat people. The good ones want to work with good clients."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-brand-navy px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold text-white">Worked<span className="text-brand-amber">With</span></p>
              <p className="mt-1 text-sm font-medium text-white/50">Know who you&apos;re working with.</p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <a href="/find" className="text-sm text-white/50 hover:text-white transition-colors">Find a tradesperson</a>
              <a href="/pricing" className="text-sm text-white/50 hover:text-white transition-colors">Pricing</a>
              <a href="/faq" className="text-sm text-white/50 hover:text-white transition-colors">FAQ</a>
              <a href="/for-trades" className="text-sm text-white/50 hover:text-white transition-colors">Join as Trade</a>
              <a href="/for-clients" className="text-sm text-white/50 hover:text-white transition-colors">Join as Client</a>
              <a href="/sign-in" className="text-sm text-white/50 hover:text-white transition-colors">Sign in</a>
              <a href="/terms" className="text-sm text-white/50 hover:text-white transition-colors">Terms</a>
              <a href="/privacy" className="text-sm text-white/50 hover:text-white transition-colors">Privacy</a>
            </nav>
          </div>
          <p className="mt-10 text-xs text-white/30">
            &copy; {new Date().getFullYear()} WorkedWith. All rights reserved. Registered in England &amp; Wales.
          </p>
        </div>
      </footer>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function StepCard({ number, icon, title, body }: { number: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="relative rounded-2xl bg-white border border-gray-200 border-l-[3px] p-8 shadow-sm hover:shadow-lg transition-shadow duration-200" style={{ borderLeftColor: '#F59E0B' }}>
      <span className="block text-7xl font-black leading-none select-none" style={{ color: 'rgba(245,158,11,0.18)' }}>{number}</span>
      <div className="mt-4 text-brand-amber">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold text-brand-navy">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  )
}

function TrustCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 border-t-2 border-t-brand-amber p-8 shadow-sm">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-navy/5">{icon}</div>
      <p className="font-bold text-base text-brand-navy">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  )
}

function SearchIcon() {
  return <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
}
function StarIcon() {
  return <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
}
function HandshakeIcon() {
  return <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" /></svg>
}
function ShieldIcon() {
  return <svg className="h-7 w-7 text-brand-navy" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.75.75 0 0 1 .232.58 13.368 13.368 0 0 1-5.83 10.973.531.531 0 0 1-.618 0 13.368 13.368 0 0 1-5.83-10.973.75.75 0 0 1 .233-.581 11.947 11.947 0 0 0 7.057-2.748Zm4.261 4.16a.75.75 0 0 0-1.06-1.06l-3.094 3.093-1.422-1.422a.75.75 0 1 0-1.06 1.06l1.953 1.953a.75.75 0 0 0 1.06 0l3.623-3.623Z" clipRule="evenodd" /></svg>
}
function FreeIcon() {
  return <svg className="h-7 w-7 text-brand-navy" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm0 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-6Zm7 2a1 1 0 0 0 0 2h4a1 1 0 1 0 0-2H8Z" clipRule="evenodd" /></svg>
}
