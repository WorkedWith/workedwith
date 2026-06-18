export const metadata = {
  title: "WorkedWith — Know who you're working with",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight text-brand-navy">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/sign-in"
              className="min-h-[44px] flex items-center px-4 text-sm font-medium text-gray-600 hover:text-brand-navy transition-colors"
            >
              Sign in
            </a>
            <a
              href="/join/trade"
              className="min-h-[44px] flex items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy hover:bg-amber-400 transition-colors"
            >
              Join free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-brand-navy px-4 py-20 sm:py-28 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl text-balance">
            Know who you&apos;re working with.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 text-balance">
            The only platform where both the tradesperson and the client have a
            reputation to protect. Mutual reviews. Verified identities. Real
            accountability.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
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
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-amber">
            How it works
          </h2>
          <p className="mt-3 text-center text-3xl font-bold text-brand-navy">
            Three steps. Total accountability.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <StepCard
              number="01"
              title="Log your job"
              body="The tradesperson logs the job and invites the client to confirm it. Both parties know a review is coming before work begins."
            />
            <StepCard
              number="02"
              title="Complete the work"
              body="Jobs are completed with a verified work history that belongs to both parties — not a platform that can delete it."
            />
            <StepCard
              number="03"
              title="Leave mutual reviews"
              body="Neither review is visible until both have been submitted. Honest. Fair. No gaming the system."
            />
          </div>
        </div>
      </section>

      {/* ── Two-sided value ───────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-brand-navy">
            Built for both sides
          </h2>
          <p className="mt-3 text-center text-base text-gray-500">
            Most platforms only care about one side. WorkedWith keeps everyone accountable.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {/* For tradespeople */}
            <div className="rounded-2xl bg-brand-navy p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                For Tradespeople
              </p>
              <h3 className="mt-3 text-2xl font-bold">Your reputation, protected.</h3>
              <ul className="mt-6 space-y-4">
                <BulletPoint text="Vet clients before you commit — see their rating and review history" />
                <BulletPoint text="Build a verified work history you own, not a platform that can take it away" />
                <BulletPoint text="Warn trusted colleagues about problematic clients with red flags" />
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
                Hire with confidence.
              </h3>
              <ul className="mt-6 space-y-4">
                <BulletPoint text="Find tradespeople with verified mutual reviews — not just curated five-stars" dark />
                <BulletPoint text="Know your reputation matters too — tradespeople can see how you treat people" dark />
                <BulletPoint text="Reduce disputes — both sides confirm the job before reviews are possible" dark />
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

      {/* ── Trust signals ────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <TrustCard
              title="Verified identities"
              body="Phone verification as standard. Optional ID check for full verification."
            />
            <TrustCard
              title="Blind submission"
              body="Neither review is visible until both parties have submitted."
            />
            <TrustCard
              title="Pre-commitment"
              body="Both parties confirm the job before reviews are possible. No ambiguity."
            />
            <TrustCard
              title="UK trades focused"
              body="Built specifically for the UK trades market and how it actually works."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-brand-navy px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold text-white">
                Worked<span className="text-brand-amber">With</span>
              </p>
              <p className="mt-1 text-sm text-white/40">Know who you&apos;re working with.</p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <a href="/pricing" className="text-sm text-white/50 hover:text-white transition-colors">Pricing</a>
              <a href="/join/trade" className="text-sm text-white/50 hover:text-white transition-colors">Join as Trade</a>
              <a href="/join/client" className="text-sm text-white/50 hover:text-white transition-colors">Join as Client</a>
              <a href="/sign-in" className="text-sm text-white/50 hover:text-white transition-colors">Sign in</a>
            </nav>
          </div>
          <p className="mt-8 text-xs text-white/30">
            &copy; {new Date().getFullYear()} WorkedWith. All rights reserved. Registered in England &amp; Wales.
          </p>
        </div>
      </footer>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function StepCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="relative rounded-2xl bg-white border border-gray-200 p-7 shadow-sm">
      <span className="text-4xl font-bold text-gray-100">{number}</span>
      <h3 className="mt-3 text-lg font-semibold text-brand-navy">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  )
}

function BulletPoint({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 text-base ${dark ? 'text-brand-amber' : 'text-brand-amber'}`}>✓</span>
      <span className={`text-sm leading-relaxed ${dark ? 'text-gray-700' : 'text-white/80'}`}>{text}</span>
    </li>
  )
}

function TrustCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
      <p className="font-semibold text-brand-navy text-sm">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">{body}</p>
    </div>
  )
}
