function Step({ n, title, body, children }: { n: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="relative flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">{children}</div>
      <span className="mt-4 text-xs font-bold uppercase tracking-widest text-brand-amber">Step {n}</span>
      <h3 className="mt-1 text-lg font-bold text-white">{title}</h3>
      <p className="mt-1 max-w-[16rem] text-sm leading-relaxed text-white/60">{body}</p>
    </li>
  )
}

const icon = 'h-8 w-8 text-brand-amber'
const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true }

/** Three steps with simple drawn icons, for dark backgrounds. */
export function HowItWorksStrip() {
  return (
    <ol className="grid gap-10 sm:grid-cols-3 sm:gap-6">
      <Step n="1" title="Log the job" body="The trade or the client logs it, or adds a job they have already done.">
        <svg className={icon} {...common}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
      </Step>
      <Step n="2" title="Both confirm it" body="Nobody can review a job the other side has not confirmed.">
        <svg className={icon} {...common}><circle cx="9" cy="9" r="4" /><circle cx="17" cy="11" r="3" /><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="m15 17 2 2 4-4" /></svg>
      </Step>
      <Step n="3" title="Review each other" body="Reviews stay hidden until both are in, so nobody writes back in revenge.">
        <svg className={icon} {...common}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" /></svg>
      </Step>
    </ol>
  )
}
