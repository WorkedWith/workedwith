import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageShell, PageTitle } from '@/components/ui'
import { SavedItemsClient } from './saved-items-client'

export const metadata = { title: 'Saved items | WorkedWith' }

export default async function SavedItemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  const admin = createAdminClient()
  const { data } = await admin.from('saved_items').select('id, description, price_pence').eq('trade_id', user.id).order('description')
  return (
    <PageShell>
      <PageTitle title="Saved items" sub="Lines you use often, ready to drop into a quote." back={{ href: '/profile', label: 'Profile' }} />
      <SavedItemsClient items={(data ?? []).map(i => ({ id: i.id as string, description: i.description as string, pricePence: i.price_pence as number }))} />
    </PageShell>
  )
}
