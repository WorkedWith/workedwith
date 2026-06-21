import type { Metadata } from 'next'
import { DemoProfilePage } from '@/components/demo/demo-profile-page'
import { DEMO_TRADE_PROFILES, DEMO_REVIEWS_OWEN } from '@/lib/demo-data'

export const metadata: Metadata = { title: 'Owen Pritchard — Plumber | WorkedWith (Example)' }

const profile = DEMO_TRADE_PROFILES.find(p => p.id === 'demo-3')!

export default function DemoOwenPritchardPage() {
  return <DemoProfilePage profile={profile} reviews={DEMO_REVIEWS_OWEN} />
}
