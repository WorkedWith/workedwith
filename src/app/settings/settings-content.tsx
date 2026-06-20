'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/actions/sign-out'
import { deleteAccount } from '@/actions/delete-account'

export function SettingsContent({ email }: { email: string }) {
  const [resetSent, setResetSent] = useState(false)
  const [resetPending, startResetTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletePending, startDeleteTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handlePasswordReset() {
    startResetTransition(async () => {
      const supabase = createClient()
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      setResetSent(true)
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteAccount()
      if (result?.error) {
        setDeleteError(result.error)
        setDeleteConfirm(false)
      }
    })
  }

  return (
    <div className="space-y-6">

      {/* Change password */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-brand-navy">Change password</h2>
        {resetSent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm text-green-700">Password reset email sent — check your inbox.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={resetPending}
              className="min-h-[44px] rounded-xl border-2 border-brand-navy px-5 text-sm font-semibold text-brand-navy hover:bg-brand-navy hover:text-white disabled:opacity-50 transition-colors"
            >
              {resetPending ? 'Sending…' : 'Send password reset email'}
            </button>
          </div>
        )}
      </section>

      {/* Sign out */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-brand-navy">Sign out</h2>
        <p className="mb-4 text-sm text-gray-500">Sign out of your WorkedWith account on this device.</p>
        <form action={signOut}>
          <button
            type="submit"
            className="min-h-[44px] rounded-xl border-2 border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </form>
      </section>

      {/* Delete account */}
      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-red-700">Delete account</h2>
        <p className="mb-4 text-sm text-gray-500">
          Permanently delete your account. Your reviews will be anonymised. This cannot be undone.
        </p>

        {deleteError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{deleteError}</p>
          </div>
        )}

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="min-h-[44px] rounded-xl border-2 border-red-300 px-5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red-700">Are you sure? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deletePending}
                className="min-h-[44px] rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletePending ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="min-h-[44px] rounded-xl border-2 border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}
