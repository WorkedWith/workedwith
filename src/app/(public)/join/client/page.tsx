export default function JoinClientPage() {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Wordmark */}
        <div className="text-center mb-10">
          <a href="/" className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
            Join as a Client
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Which best describes you?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="/join/client/individual"
            className="group flex flex-col gap-3 rounded-2xl border-2 border-white/20 bg-white/5 p-7 hover:border-brand-amber hover:bg-white/10 transition-all"
          >
            <span className="text-3xl" aria-hidden>🏠</span>
            <div>
              <h2 className="text-lg font-bold text-white">Homeowner or landlord</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                I hire tradespeople for my home or property.
              </p>
            </div>
            <span className="mt-auto text-sm font-semibold text-brand-amber group-hover:underline">
              Continue →
            </span>
          </a>

          <a
            href="/join/client/business"
            className="group flex flex-col gap-3 rounded-2xl border-2 border-white/20 bg-white/5 p-7 hover:border-brand-amber hover:bg-white/10 transition-all"
          >
            <span className="text-3xl" aria-hidden>🏢</span>
            <div>
              <h2 className="text-lg font-bold text-white">Business</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                I represent a company that commissions trade work.
              </p>
            </div>
            <span className="mt-auto text-sm font-semibold text-brand-amber group-hover:underline">
              Continue →
            </span>
          </a>
        </div>

        <p className="mt-8 text-center text-sm text-white/50">
          Already have an account?{' '}
          <a href="/sign-in" className="font-medium text-brand-amber hover:underline">
            Sign in
          </a>
        </p>
        <p className="mt-2 text-center text-sm text-white/50">
          Joining as a tradesperson?{' '}
          <a href="/join/trade" className="font-medium text-white/70 hover:text-white">
            Trade sign up
          </a>
        </p>
      </div>
    </main>
  )
}
