'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteMatchesUser } from '@/lib/invite-match'
import type { PendingInvite } from '@/types/database'

export type TradeRequest = {
  id: string
  token: string
  clientName: string
  jobType: string
  jobDate: string
  description: string | null
}

/** Job requests that clients have sent to this tradesperson and that are still waiting. */
export async function getTradeRequests(): Promise<TradeRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data: me } = await admin.from('users').select('email, phone, phone_verified').eq('id', user.id).single()
  if (!me) return []
  const person = me as unknown as { email: string | null; phone: string | null; phone_verified: boolean }

  const filters: string[] = []
  if (person.email) filters.push(`contact_email.ilike.${person.email.replace(/[,()]/g, '')}`)
  if (person.phone && person.phone_verified) filters.push(`contact_phone.eq.${person.phone}`)
  if (filters.length === 0) return []

  const { data: raw } = await admin
    .from('pending_invites')
    .select('*')
    .eq('status', 'sent')
    .gt('expires_at', new Date().toISOString())
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(20)

  const invites = ((raw ?? []) as unknown as PendingInvite[]).filter(i => inviteMatchesUser(i, person))
  if (invites.length === 0) return []

  const clientIds = Array.from(new Set(invites.map(i => i.inviting_client_id)))
  const [{ data: users }, { data: profiles }] = await Promise.all([
    admin.from('users').select('id, full_name').in('id', clientIds),
    admin.from('client_profiles').select('user_id, display_name, company_name').in('user_id', clientIds),
  ])
  const nameOf = (id: string): string => {
    const p = (profiles ?? []).find(x => (x as { user_id: string }).user_id === id) as
      { display_name: string | null; company_name: string | null } | undefined
    const u = (users ?? []).find(x => (x as { id: string }).id === id) as { full_name: string } | undefined
    return p?.display_name ?? p?.company_name ?? u?.full_name ?? 'A client'
  }

  return invites.map(i => ({
    id: i.id,
    token: i.claim_token,
    clientName: nameOf(i.inviting_client_id),
    jobType: i.job_type,
    jobDate: i.job_date,
    description: i.description,
  }))
}
