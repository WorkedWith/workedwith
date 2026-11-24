import { createAdminClient } from '@/lib/supabase/admin'
import { cardsMode } from '@/lib/cards/mode'
import { Card } from '@/components/ui'
import { CardsControls } from './cards-controls'

/** Accept cards (optional, any time), PRD 4 step 4. */
export async function CardsSection({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const { data } = await admin.from('trade_card_accounts').select('*').eq('trade_id', userId).maybeSingle()
  return (
    <Card>
      <h2 className="text-lg font-bold text-brand-navy">Accept cards</h2>
      <p className="mt-1 text-sm text-gray-600">Optional. Bank transfer is free; cards cost you Stripe’s fee.</p>
      <div className="mt-4">
        <CardsControls mock={cardsMode() === 'mock'} account={data ? { charges: !!data.charges_enabled, enabled: !!data.cards_enabled, limit: ((data.card_limit_pence as number) / 100).toFixed(0) } : null} />
      </div>
    </Card>
  )
}
