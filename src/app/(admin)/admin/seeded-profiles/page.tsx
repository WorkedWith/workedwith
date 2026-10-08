import { APP_URL } from '@/lib/app-url'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddSeededProfileForm } from './add-form'
import { CopyClaimLink } from './copy-claim-link'
import type { SeededProfile, DoNotReseed } from '@/types/database'



export const metadata = { title: 'Seeded Profiles — WorkedWith Admin' }

function daysRemaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
}

function outreachSent(profile: SeededProfile): string {
  const sent: string[] = []
  if (profile.initial_invite_sent_at) sent.push('Day 0')
  if (profile.reminder_1_sent_at) sent.push('3')
  if (profile.reminder_2_sent_at) sent.push('7')
  if (profile.reminder_3_sent_at) sent.push('14')
  if (sent.length === 0) return profile.contact_email || profile.contact_phone ? 'Pending' : 'No contact'
  return sent.join(', ')
}

const STATUS_CLASSES: Record<string, string> = {
  unclaimed: 'bg-amber-100 text-amber-700',
  claimed:   'bg-green-100 text-green-700',
  removed:   'bg-gray-100 text-gray-500',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default async function SeededProfilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!userData?.is_admin) redirect('/dashboard')

  const [{ data: rawProfiles }, { data: rawDns }] = await Promise.all([
    admin
      .from('seeded_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('do_not_reseed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const profiles = (rawProfiles ?? []) as unknown as SeededProfile[]
  const dnsList = (rawDns ?? []) as unknown as DoNotReseed[]

  const counts = profiles.reduce(
    (acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )

  return (
    <div className="max-w-5xl space-y-10">

      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seeded Profiles</h1>
        <p className="mt-1 text-sm text-gray-500">
          Admin-seeded trade listings. They fill thin search results and fade out as real density arrives.
        </p>
      </div>

      {/* ── Summary pills ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {(['unclaimed', 'claimed', 'removed'] as const).map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[s]}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            <span className="text-sm text-gray-600">{counts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* ── Add form ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-gray-900">Add a listing</h2>
        <AddSeededProfileForm />
      </section>

      {/* ── Listings table ───────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          All listings ({profiles.length})
        </h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-gray-500">No seeded profiles yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Created', 'Business', 'Trade', 'Areas', 'Status', 'Days left', 'Reminders', 'Contact', 'Claim link'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles.map(p => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/t/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand-navy hover:underline"
                      >
                        {p.business_name}
                      </a>
                      <p className="text-xs text-gray-400 font-mono">/t/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{(p.trade_categories?.length ? p.trade_categories : [p.trade_category]).join(', ')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {p.operating_areas.join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {p.status === 'unclaimed' ? daysRemaining(p.expires_at) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {outreachSent(p)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {p.contact_email && <div>Email</div>}
                      {p.contact_phone && <div>Phone</div>}
                      {!p.contact_email && !p.contact_phone && <span className="text-gray-300">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'unclaimed' ? (
                        <CopyClaimLink url={`${APP_URL}/claim/${p.claim_token}`} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Do-not-reseed list ───────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-gray-900">Do-not-reseed list ({dnsList.length})</h2>
        <p className="mb-3 text-xs text-gray-400">
          Phone and email are stored as SHA-256 hashes only. Contact details are never retained.
        </p>
        {dnsList.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Added', 'Business name', 'Phone hash', 'Email hash'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dnsList.map(d => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmtDate(d.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.business_name_normalised}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {d.phone_hash ? `${d.phone_hash.slice(0, 12)}…` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {d.email_hash ? `${d.email_hash.slice(0, 12)}…` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}
