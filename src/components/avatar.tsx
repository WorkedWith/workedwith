/**
 * Profile picture with a fallback. When there is no photo it shows a circle
 * with the initials of the name (organisation name first where there is one).
 * The colour comes from the name, so the same person always looks the same.
 * Pass tradeIcon to add a small trade badge on the corner.
 */
import { TradeIcon } from '@/components/trade-icon'

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

// Mid tone backgrounds that all read well with white or navy text and sit on navy or white.
const PALETTE = [
  'bg-brand-amber text-brand-navy',
  'bg-teal-600 text-white',
  'bg-indigo-500 text-white',
  'bg-emerald-600 text-white',
  'bg-rose-500 text-white',
  'bg-sky-600 text-white',
  'bg-orange-500 text-white',
  'bg-violet-500 text-white',
]

function paletteFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

type AvatarProps = {
  name: string
  photoUrl?: string | null
  /** Tailwind size classes, for example "h-20 w-20". */
  sizeClass?: string
  textClass?: string
  /** Ring colour classes, for use on a dark background. */
  ringClass?: string
  /** A trade name. Shows that trade's icon as a small badge on the corner. */
  tradeIcon?: string | null
}

export function Avatar({
  name,
  photoUrl,
  sizeClass = 'h-12 w-12',
  textClass = 'text-base',
  ringClass = '',
  tradeIcon = null,
}: AvatarProps) {
  const circle = photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={`${name} profile photo`}
      className={`${sizeClass} ${ringClass} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <div
      aria-hidden="true"
      className={`${sizeClass} ${ringClass} ${textClass} ${paletteFor(name)} flex shrink-0 select-none items-center justify-center rounded-full font-bold`}
    >
      {initialsOf(name)}
    </div>
  )

  if (!tradeIcon) return circle

  return (
    <div className="relative shrink-0">
      {circle}
      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-navy text-white">
        <TradeIcon trade={tradeIcon} className="h-3 w-3" />
      </span>
    </div>
  )
}
