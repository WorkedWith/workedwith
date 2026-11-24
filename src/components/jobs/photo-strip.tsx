export function PhotoStrip({ paths, urls }: { paths: string[]; urls: Map<string, string> }) {
  const shown = paths.map(p => urls.get(p)).filter((u): u is string => !!u)
  if (shown.length === 0) return null
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto">
      {shown.map(u => (
        <a key={u} href={u} target="_blank" rel="noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="Photo of the work" className="h-20 w-20 rounded-lg object-cover" />
        </a>
      ))}
    </div>
  )
}
