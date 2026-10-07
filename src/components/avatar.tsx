/**
 * Profile picture with a fallback. When there is no photo it shows a circle
 * with the initials of the name (organisation name first where there is one).
 */

export function initialsOf(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const second = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + second).toUpperCase()
}

type AvatarProps = {
  name: string
  photoUrl?: string | null
  /** Tailwind size classes, for example "h-20 w-20". */
  sizeClass?: string
  textClass?: string
  /** Ring colour classes, for use on a dark background. */
  ringClass?: string
}

export function Avatar({
  name,
  photoUrl,
  sizeClass = 'h-12 w-12',
  textClass = 'text-base',
  ringClass = '',
}: AvatarProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`${name} profile photo`}
        className={`${sizeClass} ${ringClass} shrink-0 rounded-full object-cover`}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className={`${sizeClass} ${ringClass} ${textClass} flex shrink-0 select-none items-center justify-center rounded-full bg-brand-amber font-bold text-brand-navy`}
    >
      {initialsOf(name)}
    </div>
  )
}
