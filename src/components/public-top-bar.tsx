export function PublicTopBar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <a href="/" className="text-xl font-bold tracking-tight text-brand-navy">
          Worked<span className="text-brand-amber">With</span>
        </a>
        <div className="flex items-center gap-1 sm:gap-3">
          <a
            href="/find"
            className="hidden min-h-[44px] items-center px-3 text-sm font-medium text-gray-600 transition-colors hover:text-brand-navy sm:flex"
          >
            Find a tradesperson
          </a>
          <a
            href="/pricing"
            className="hidden min-h-[44px] items-center px-3 text-sm font-medium text-gray-600 transition-colors hover:text-brand-navy sm:flex"
          >
            Pricing
          </a>
          <a
            href="/sign-in"
            className="flex min-h-[44px] items-center px-3 text-sm font-medium text-gray-600 transition-colors hover:text-brand-navy"
          >
            Sign in
          </a>
          <a
            href="/join"
            className="flex min-h-[44px] items-center rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy transition-colors hover:bg-amber-400"
          >
            Join
          </a>
        </div>
      </div>
    </nav>
  )
}
