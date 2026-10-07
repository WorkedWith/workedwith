/** Short readable summary of the districts someone covers, for example "Covers M20, SK4 and 2 more areas". */
export function formatAreas(areas: string[] | null | undefined, show = 3): string | null {
  const list = (areas ?? []).filter(Boolean)
  if (list.length === 0) return null
  const shown = list.slice(0, show).join(', ')
  const rest = list.length - show
  if (rest <= 0) return `Covers ${shown}`
  return `Covers ${shown} and ${rest} more area${rest === 1 ? '' : 's'}`
}
