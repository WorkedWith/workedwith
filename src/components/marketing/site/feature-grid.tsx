export type Feature = { title: string; body: string; icon: string }

export function FeatureGrid({ items, columns = 3 }: { items: Feature[]; columns?: 2 | 3 }) {
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}>
      {items.map(f => (
        <li key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">{f.icon}</span>
          <h3 className="mt-4 text-lg font-bold text-brand-navy">{f.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
        </li>
      ))}
    </ul>
  )
}

export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <li key={s.title} className="rounded-2xl bg-white p-6 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-amber text-sm font-bold text-brand-navy">{i + 1}</span>
          <h3 className="mt-4 text-base font-bold text-brand-navy">{s.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.body}</p>
        </li>
      ))}
    </ol>
  )
}
