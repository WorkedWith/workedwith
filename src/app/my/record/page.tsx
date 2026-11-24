import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientProfileView } from '@/app/profile/client-profile-view'
import type { ClientProfile } from '@/types/database'

export const metadata = { title: 'My record | WorkedWith' }

/** The client's own full record (PRD 14). Rebuilt with payment figures in phase 9. */
export default async function MyRecordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in/code')
  const admin = createAdminClient()
  const [{ data: u }, { data: cp }] = await Promise.all([
    admin.from('users').select('full_name, profile_photo_url').eq('id', user.id).single(),
    admin.from('client_profiles').select('*').eq('user_id', user.id).maybeSingle(),
  ])
  if (!cp) redirect('/my/jobs')
  return (
    <div className="pb-28">
      <ClientProfileView userId={user.id} fullName={(u?.full_name as string) ?? ''} clientProfile={cp as unknown as ClientProfile} photoUrl={(u?.profile_photo_url as string | null) ?? null} />
    </div>
  )
}
