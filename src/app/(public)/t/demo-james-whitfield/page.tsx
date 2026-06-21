import type { Metadata } from 'next'
import { DemoProfilePage } from '@/components/demo/demo-profile-page'
import { DEMO_TRADE_PROFILES, DEMO_CLIENT_REVIEWS } from '@/lib/demo-data'

export const metadata: Metadata = { title: 'James Whitfield — Electrician | WorkedWith (Example)' }

const profile = DEMO_TRADE_PROFILES.find(p => p.id === 'demo-1')!

export default function DemoJamesWhitfieldPage() {
  return <DemoProfilePage profile={profile} reviews={DEMO_CLIENT_REVIEWS} />
}
