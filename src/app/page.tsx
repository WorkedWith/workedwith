import { TRADE_TYPES } from '@/lib/trade-types'
import { LandingNav } from '@/components/landing-nav'

export const metadata = {
  title: "WorkedWith — Know who you're working with",
}

const SOCIAL_PROOF_TRADES = [
  'Electricians', 'Plumbers', 'Builders', 'Joiners', 'Plasterers',
  'Decorators', 'Roofers', 'Tilers', 'Landscapers', 'Gas Engineers',
  'Carpenters', 'Bricklayers',
]

const COMPARISON_ROWS: { feature: string; ww: boolean; ca: boolean; gr: boolean }[] = [
  { feature: 'Verified tradesperson reviews', ww: true,  ca: true,  gr: false },
  { feature: 'Client reviews of tradespeople', ww: true,  ca: false, gr: false },
  { feature: 'Both parties verified',          ww: true,  ca: false, gr: false },
  { feature: 'Blind review submission',        ww: true,  ca: false, gr: false },
  { feature: 'Pre-confirmed jobs',             ww: true,  ca: false, gr: false },
  { feature: 'Client reputation profile',      ww: true,  ca: false, gr: false },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-brand-navy overflow-hidden px-4 pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-44 lg:pb-20 sm:px-6">
        {/* Dot-grid SVG overlay — 15% opacity */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" fillOpacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl text-balance">
            Reviews that work{' '}
            <span style={{ textDecoration: 'underline', textDecorationColor: '#F59E0B', textUnderlineOffset: '6px' }}>
              both ways
            </span>.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/70 text-balance">
            Tradespeople review clients. Clients review tradespeople. Both reputations
            are on the line. So everyone shows up properly.
          </p>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/join/trade"
              className="min-h-[52px] w-full flex items-center justify-center rounded-xl bg-brand-amber px-8 text-base font-semibold text-brand-navy hover:bg-amber-400 transition-colors sm:w-auto"
            >
              Join as a Tradesperson
            </a>
            <a
              href="/join/client"
              className="min-h-[52px] w-full flex items-center justify-center rounded-xl border-2 border-white/30 px-8 text-base font-semibold text-white hover:bg-white/10 transition-colors sm:w-auto"
            >
              Join as a Client
            </a>
          </div>

          {/* Quick search shortcut */}
          <div className="mt-14 border-t border-white/10 pt-10">
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-white text-center">
              Or find a tradesperson now
            </p>
            <div className="mx-auto max-w-3xl w-full rounded-2xl bg-white/10 backdrop-blur-sm p-5 shadow-xl ring-1 ring-white/20">
              <form
                method="GET"
                action="/find"
                className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-center"
              >
                <select
                  id="hero-trade"
                  name="trade"
                  required
                  className="h-12 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-brand-navy focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
                >
                  <option value="" disabled>Select a trade type</option>
                  {TRADE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  id="hero-postcode"
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
          </div>
        </div>
      </section>

      {/* ── Trade type social proof bar ───────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-100 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
            Tradespeople on WorkedWith include
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SOCIAL_PROOF_TRADES.map(trade => (
              <span
                key={trade}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm"
              >
                {trade}
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
            Three steps. Total accountability.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            <StepCard
              number="01"
              icon={<ClipboardIcon />}
              title="Log your job"
              body="The tradesperson logs the job and invites the client to confirm. Both parties know a review is coming before a single tool is picked up."
            />
            <StepCard
              number="02"
              icon={<WrenchIcon />}
              title="Complete the work"
              body="Complete the work knowing your reputation is being built in real time. No surprises. No ambiguity."
            />
            <StepCard
              number="03"
              icon={<StarIcon />}
              title="Leave mutual reviews"
              body="Each party submits their review privately. Neither can see what the other has written. Both reviews go live at the same time. Honest. Fair."
            />
          </div>
        </div>
      </section>

      {/* ── Two-sided value ───────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-brand-navy sm:text-4xl">
            Built for both sides
          </h2>
          <p className="mt-4 text-center text-base text-gray-500">
            Most platforms only care about one side. WorkedWith keeps everyone accountable.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {/* For tradespeople */}
            <div className="rounded-2xl bg-brand-navy p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                For Tradespeople
              </p>
              <h3 className="mt-3 text-2xl font-bold">Stop working blind.</h3>
              <ul className="mt-6 space-y-4">
                <BulletPoint text="See a client's rating and payment history before you quote" />
                <BulletPoint text="Build a verified work record you own. Not locked to someone else's platform." />
                <BulletPoint text="Flag bad clients so other trades know what they're walking into" />
              </ul>
              <a
                href="/join/trade"
                className="mt-8 inline-flex min-h-[48px] items-center rounded-xl bg-brand-amber px-6 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
              >
                Join as a Tradesperson →
              </a>
            </div>

            {/* For clients */}
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
                For Clients
              </p>
              <h3 className="mt-3 text-2xl font-bold text-brand-navy">
                Find tradespeople you can trust.
              </h3>
              <ul className="mt-6 space-y-4">
                <BulletPoint text="Every review is verified. No fake five-stars, no anonymous complaints." dark />
                <BulletPoint text="Tradespeople can see how you treat people. The good ones want to work with you." dark />
                <BulletPoint text="Both parties confirm the job before reviews are possible. No he said she said." dark />
              </ul>
              <a
                href="/join/client"
                className="mt-8 inline-flex min-h-[48px] items-center rounded-xl bg-brand-navy px-6 text-sm font-semibold text-white hover:bg-brand-navy/90 transition-colors"
              >
                Join as a Client →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Competitor comparison ─────────────────────────────── */}
      <section className="bg-white px-4 py-16 sm:py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-brand-navy sm:text-4xl">
            How WorkedWith compares
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-gray-500">
            Most platforms only protect one side. WorkedWith is the only platform where both parties have a reputation to protect.
          </p>

          <div className="mt-12 overflow-x-auto rounded-xl shadow-sm border border-gray-200">
            <table className="w-full min-w-[540px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="bg-gray-50 px-6 py-4 text-left font-semibold text-gray-600 w-1/2">
                    Feature
                  </th>
                  <th className="bg-brand-amber px-6 py-4 text-center font-bold text-brand-navy">
                    WorkedWith
                  </th>
                  <th className="bg-gray-50 px-6 py-4 text-center font-semibold text-gray-500">
                    Checkatrade
                  </th>
                  <th className="bg-gray-50 px-6 py-4 text-center font-semibold text-gray-500">
                    Google Reviews
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-gray-700 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-center text-lg">{row.ww ? '✅' : '❌'}</td>
                    <td className="px-6 py-4 text-center text-lg">{row.ca ? '✅' : '❌'}</td>
                    <td className="px-6 py-4 text-center text-lg">{row.gr ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Trust signals ────────────────────────────────────── */}
      <section className="px-4 py-20 sm:py-24 sm:px-6" style={{ backgroundColor: '#F3F4F6' }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-amber mb-12">
            Why WorkedWith
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <TrustCard
              icon={<ShieldIcon />}
              title="Verified identities"
              body="Phone verification as standard. Optional ID check for full verification."
            />
            <TrustCard
              icon={<EyeIcon />}
              title="Blind reviews"
              body="Neither party can see the other's review until both are published. No retaliation. No gaming."
            />
            <TrustCard
              icon={<HandshakeIcon />}
              title="Both parties confirm the job first"
              body="Both parties confirm the job before reviews are possible. No ambiguity."
            />
            <TrustCard
              icon={<FlagIcon />}
              title="UK trades focused"
              body="Built specifically for the UK trades market and how it actually works."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-brand-navy px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold text-white">
                Worked<span className="text-brand-amber">With</span>
              </p>
              <p className="mt-1 text-sm font-medium text-white/50">Know who you&apos;re working with.</p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <a href="/find" className="text-sm text-white/50 hover:text-white transition-colors">Find a tradesperson</a>
              <a href="/pricing" className="text-sm text-white/50 hover:text-white transition-colors">Pricing</a>
              <a href="/faq" className="text-sm text-white/50 hover:text-white transition-colors">FAQ</a>
              <a href="/join/trade" className="text-sm text-white/50 hover:text-white transition-colors">Join as Trade</a>
              <a href="/join/client" className="text-sm text-white/50 hover:text-white transition-colors">Join as Client</a>
              <a href="/sign-in" className="text-sm text-white/50 hover:text-white transition-colors">Sign in</a>
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
    <div
      className="relative rounded-2xl bg-white border border-gray-200 border-l-[3px] p-8 shadow-sm hover:shadow-lg transition-shadow duration-200"
      style={{ borderLeftColor: '#F59E0B' }}
    >
      <span className="block text-7xl font-black leading-none select-none" style={{ color: 'rgba(245,158,11,0.18)' }}>
        {number}
      </span>
      <div className="mt-4 text-brand-amber">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold text-brand-navy">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  )
}

function BulletPoint({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-base text-brand-amber">✓</span>
      <span className={`text-sm leading-relaxed ${dark ? 'text-gray-700' : 'text-white/80'}`}>{text}</span>
    </li>
  )
}

function TrustCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 border-t-2 border-t-brand-amber p-8 shadow-sm">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-navy/5">
        {icon}
      </div>
      <p className="font-bold text-base text-brand-navy">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  )
}

// ── Step icons ────────────────────────────────────────────────

function ClipboardIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="1" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ── Trust card icons ──────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg className="h-7 w-7 text-brand-navy" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.75.75 0 0 1 .232.58 13.368 13.368 0 0 1-5.83 10.973.531.531 0 0 1-.618 0 13.368 13.368 0 0 1-5.83-10.973.75.75 0 0 1 .233-.581 11.947 11.947 0 0 0 7.057-2.748Zm4.261 4.16a.75.75 0 0 0-1.06-1.06l-3.094 3.093-1.422-1.422a.75.75 0 1 0-1.06 1.06l1.953 1.953a.75.75 0 0 0 1.06 0l3.623-3.623Z" clipRule="evenodd" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="h-7 w-7 text-brand-navy" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  )
}

function HandshakeIcon() {
  return (
    <svg className="h-7 w-7 text-brand-navy" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path fillRule="evenodd" d="M4.172 4.172a4 4 0 0 1 5.656 0L10 4.343l.172-.171a4 4 0 1 1 5.656 5.656L10 16.657l-5.828-5.829a4 4 0 0 1 0-5.656Zm1.414 1.414a2 2 0 0 0 0 2.828l4.414 4.414 4.414-4.414a2 2 0 1 0-2.828-2.828L10 6.757l-1.586-1.585a2 2 0 0 0-2.828 0Z" clipRule="evenodd" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg className="h-7 w-7 text-brand-navy" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439L3.5 3.16V2.75Z" />
    </svg>
  )
}
