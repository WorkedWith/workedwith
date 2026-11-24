export function MarketingFooter() {
  return (
    <footer className="bg-brand-navy px-4 py-12 text-white/70 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        <div>
          <p className="text-xl font-bold text-white">Worked<span className="text-brand-amber">With</span></p>
          <p className="mt-2 text-sm">Know who you&apos;re working with.</p>
        </div>
        <div className="space-y-2 text-sm">
          <a href="/for-trades" className="block hover:text-white">For trades</a>
          <a href="/for-clients" className="block hover:text-white">For clients</a>
          <a href="/pricing" className="block hover:text-white">Pricing</a>
          <a href="/faq" className="block hover:text-white">FAQ</a>
        </div>
        <div className="space-y-2 text-sm">
          <a href="/find" className="block hover:text-white">Find a trade</a>
          <a href="/terms" className="block hover:text-white">Terms</a>
          <a href="/privacy" className="block hover:text-white">Privacy</a>
          <a href="/sign-in" className="block hover:text-white">Sign in</a>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-white/40">
        WorkedWith never holds your money. Clients pay trades directly by bank transfer, or by card through the trade&apos;s own Stripe account.
      </p>
    </footer>
  )
}
