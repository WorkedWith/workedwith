import {
  AppWindow, Armchair, Bath, BrickWall, Car, CloudRain, Construction, CookingPot, Droplet,
  Fence, Flame, Hammer, HardHat, House, KeyRound, LayoutGrid, PaintBucket, PaintRoller,
  Ruler, ShowerHead, SprayCan, Thermometer, TreePine, Trees, Waves, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react'
import { parentTrade } from '@/lib/trade-types'

/** One simple line icon per main trade. Specialisms use the icon of their trade. */
const ICONS: Record<string, LucideIcon> = {
  'Bathroom Fitter': Bath,
  Bricklayer: BrickWall,
  Builder: HardHat,
  Carpenter: Hammer,
  'Cleaning and Clearance': SprayCan,
  'Damp Proofing': Droplet,
  Drainage: Waves,
  Driveways: Car,
  Electrician: Zap,
  Fencing: Fence,
  'Fitted Furniture Maker': Armchair,
  'Flooring Fitter': LayoutGrid,
  'Gas Engineer': Flame,
  'Guttering and Fascias': CloudRain,
  Handyman: Wrench,
  'Heating Engineer': Thermometer,
  Joiner: Ruler,
  'Kitchen Fitter': CookingPot,
  Landscaper: Trees,
  Locksmith: KeyRound,
  'Painter and Decorator': PaintRoller,
  Plasterer: PaintBucket,
  Plumber: ShowerHead,
  Roofer: House,
  Scaffolder: Construction,
  Tiler: LayoutGrid,
  'Tree Surgeon': TreePine,
  'Window Fitter': AppWindow,
}

export function tradeIconFor(trade: string): LucideIcon {
  return ICONS[trade] ?? (parentTrade(trade) ? ICONS[parentTrade(trade) as string] : undefined) ?? Wrench
}

type Props = { trade: string; className?: string }

/** Decorative icon for a trade. The trade name is always shown next to it. */
export function TradeIcon({ trade, className = 'h-4 w-4' }: Props) {
  const Icon = tradeIconFor(trade)
  return <Icon aria-hidden="true" className={`${className} shrink-0`} strokeWidth={2} />
}
