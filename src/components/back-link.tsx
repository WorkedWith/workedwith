export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg text-sm font-semibold text-brand-navy hover:text-brand-navy/70"
    >
      <span aria-hidden="true">←</span> {label}
    </a>
  )
}
