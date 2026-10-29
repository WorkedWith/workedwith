import { createAdminClient } from '@/lib/supabase/admin'
import type { Organisation } from '@/types/database'
import { TransferForm } from './transfer-form'

export const metadata = { title: 'Organisations — WorkedWith Admin' }

type PageProps = { searchParams: Promise<{ q?: string }> }

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

export default async function AdminOrganisationsPage({ searchParams }: PageProps) {
  const { q = '' } = await searchParams
  const admin = createAdminClient()

  let query = admin.from('organisations').select('*').order('created_at', { ascending: false }).limit(100)
  const term = q.trim().replace(/[,()%]/g, '')
  if (term) query = query.or(`company_name.ilike.%${term}%,companies_house_number.ilike.%${term}%`)
  const { data } = await query
  const orgs = (data ?? []) as unknown as Organisation[]

  const orgIds = orgs.map(o => o.id)
  const [{ data: members }, { data: users }] = await Promise.all([
    orgIds.length ? admin.from('organisation_members').select('organisation_id, user_id, role').in('organisation_id', orgIds) : Promise.resolve({ data: [] }),
    orgs.length ? admin.from('users').select('id, email, full_name').in('id', orgs.map(o => o.primary_contact_user_id).filter((x): x is string => !!x)) : Promise.resolve({ data: [] }),
  ])
  const memberRows = (members ?? []) as unknown as { organisation_id: string; user_id: string }[]
  const memberCount = new Map<string, number>()
  for (const m of memberRows) memberCount.set(m.organisation_id, (memberCount.get(m.organisation_id) ?? 0) + 1)
  const { data: memberUsers } = memberRows.length ? await admin.from('users').select('id, email, full_name').in('id', memberRows.map(m => m.user_id)) : { data: [] }
  const memberLabel = new Map(((memberUsers ?? []) as unknown as { id: string; email: string | null; full_name: string | null }[]).map(u => [u.id, `${u.full_name ?? 'Unnamed'} (${u.email ?? 'no email'})`]))
  const contact = new Map(((users ?? []) as unknown as { id: string; email: string | null; full_name: string | null }[]).map(u => [u.id, u]))

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-navy">Organisations</h1>
      <p className="mt-1 text-sm text-gray-600">Business clients. Moving a business record is the only change you can make here.</p>
      <form className="mt-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Company name or number" className="min-w-[16rem] rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      <ul className="mt-4 space-y-3">
        {orgs.length === 0 && <li className="text-sm text-gray-500">No organisations found.</li>}
        {orgs.map(o => {
          const c = o.primary_contact_user_id ? contact.get(o.primary_contact_user_id) : null
          return (
            <li key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-brand-navy">{o.company_name}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${o.companies_house_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {o.companies_house_verified ? `CH verified ${fmt(o.companies_house_verified_at)}` : 'Not verified'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Number {o.companies_house_number} · {o.company_status ?? 'status unknown'} · {o.registered_postcode ?? 'no postcode'} · {memberCount.get(o.id) ?? 0} member(s) · joined {fmt(o.created_at)}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Contact: {c ? `${c.full_name ?? 'Unnamed'} (${c.email ?? 'no email'})` : 'none'} · {o.total_reviews} reviews, {Number(o.average_rating).toFixed(1)} average, {o.red_flag_count} red flags
              </p>
              <TransferForm
                orgId={o.id}
                members={memberRows.filter(m => m.organisation_id === o.id && m.user_id !== o.primary_contact_user_id).map(m => ({ id: m.user_id, label: memberLabel.get(m.user_id) ?? m.user_id }))}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
