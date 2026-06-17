import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteForm } from './members-client'
import type { User, OrganisationMember, OrganisationInvite, OrganisationMemberRole } from '@/types/database'

export const metadata = { title: 'Team members | WorkedWith' }

// ── Role badge ────────────────────────────────────────────────
function RoleBadge({ role }: { role: OrganisationMemberRole | string }) {
  const styles: Record<string, string> = {
    owner:  'bg-brand-navy text-white',
    admin:  'bg-indigo-100 text-indigo-700',
    member: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  )
}

// ── Initials avatar ───────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-sm font-semibold text-brand-navy">
      {initials}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isExpired(iso: string): boolean {
  return new Date(iso) < new Date()
}

export default async function MembersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const admin = createAdminClient()

  // Confirm current user is owner or admin
  const { data: callerMembership } = await admin
    .from('organisation_members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    !callerMembership?.organisation_id ||
    !callerMembership.role ||
    !(['owner', 'admin'] as OrganisationMemberRole[]).includes(callerMembership.role as OrganisationMemberRole)
  ) {
    redirect('/dashboard')
  }

  const orgId = callerMembership.organisation_id

  // Fetch all data in parallel
  const [{ data: org }, { data: allMembers }, { data: allInvites }] = await Promise.all([
    admin.from('organisations').select('*').eq('id', orgId).single(),
    admin.from('organisation_members').select('*').eq('organisation_id', orgId).order('joined_at'),
    admin.from('organisation_invites').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false }),
  ])

  // Fetch user records for all members
  const memberUserIds = (allMembers ?? [])
    .map((m: OrganisationMember) => m.user_id)
    .filter((id): id is string => !!id)

  const { data: memberUsers } = memberUserIds.length
    ? await admin.from('users').select('*').in('id', memberUserIds)
    : { data: [] as User[] }

  const userMap = new Map((memberUsers ?? []).map((u: User) => [u.id, u]))

  // Split invites into pending and expired
  const pendingInvites = (allInvites ?? []).filter(
    (inv: OrganisationInvite) => !inv.accepted_at && !isExpired(inv.expires_at),
  )
  const expiredInvites = (allInvites ?? []).filter(
    (inv: OrganisationInvite) => !inv.accepted_at && isExpired(inv.expires_at),
  )

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-navy px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </span>
          <a href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{org?.company_name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">Team members</p>
        </div>

        {/* ── Current members ── */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-brand-navy">
              Members{' '}
              <span className="ml-1 text-sm font-normal text-gray-400">
                ({allMembers?.length ?? 0})
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {(allMembers ?? []).map((member: OrganisationMember) => {
              const u = member.user_id ? userMap.get(member.user_id) : undefined
              return (
                <li key={member.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar name={u?.full_name ?? '?'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {u?.full_name ?? 'Unknown user'}
                      {member.user_id === user.id && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{u?.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <RoleBadge role={member.role ?? 'member'} />
                    <span className="text-xs text-gray-400 hidden sm:block">
                      Joined {formatDate(member.joined_at)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ── Pending invites ── */}
        {pendingInvites.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-brand-navy">
                Pending invites{' '}
                <span className="ml-1 text-sm font-normal text-gray-400">
                  ({pendingInvites.length})
                </span>
              </h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {pendingInvites.map((inv: OrganisationInvite) => (
                <li key={inv.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-brand-amber">
                    <MailIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      Sent {formatDate(inv.created_at)} · Expires {formatDate(inv.expires_at)}
                    </p>
                  </div>
                  <RoleBadge role={inv.role} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Expired invites ── */}
        {expiredInvites.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-400">Expired invites</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {expiredInvites.map((inv: OrganisationInvite) => (
                <li key={inv.id} className="flex items-center gap-4 px-6 py-4 opacity-50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <MailIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{inv.email}</p>
                    <p className="text-xs text-gray-400">
                      Sent {formatDate(inv.created_at)} · Expired {formatDate(inv.expires_at)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 italic">Expired</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Invite form ── */}
        <InviteForm organisationId={orgId} />
      </div>
    </main>
  )
}

function MailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
      <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
    </svg>
  )
}
