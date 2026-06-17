'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteOrgMember } from '@/actions/invite-member'
import type { OrganisationInviteRole } from '@/types/database'

export function InviteForm({ organisationId }: { organisationId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganisationInviteRole>('member')
  const [result, setResult] = useState<
    { type: 'success'; email: string } | { type: 'error'; message: string } | null
  >(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const res = await inviteOrgMember(email.trim(), role, organisationId)
      if (res.success) {
        setResult({ type: 'success', email: res.email })
        setEmail('')
        setRole('member')
        router.refresh() // Re-fetch server component data to show new pending invite
      } else {
        setResult({ type: 'error', message: res.error })
      }
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-brand-navy mb-4">Invite a team member</h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setResult(null) }}
            placeholder="colleague@company.com"
            required
            disabled={isPending}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent
              disabled:opacity-50"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as OrganisationInviteRole)}
            disabled={isPending}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent
              disabled:opacity-50 sm:w-32"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            disabled={isPending || !email.trim()}
            className="rounded-lg bg-brand-amber px-5 py-2.5 text-sm font-semibold
              text-brand-navy transition-opacity hover:opacity-90
              disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isPending ? 'Sending…' : 'Send invite'}
          </button>
        </div>

        {result?.type === 'success' && (
          <p className="text-sm text-green-700">
            ✓ Invitation sent to <span className="font-medium">{result.email}</span>
          </p>
        )}
        {result?.type === 'error' && (
          <p className="text-sm text-red-600">{result.message}</p>
        )}
      </form>

      <p className="mt-3 text-xs text-gray-400">
        Invitations expire after 7 days. Admins can manage members and send further invites.
      </p>
    </section>
  )
}
