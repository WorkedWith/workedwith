'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/actions/update-profile'
import { TRADE_TYPES } from '@/lib/trade-types'
import type { User, TradeProfile, ClientProfile } from '@/types/database'

type Props = {
  user: Pick<User, 'full_name' | 'email' | 'phone' | 'phone_verified' | 'user_type'>
  tradeProfile: Pick<TradeProfile, 'postcode' | 'trade_types' | 'bio' | 'years_experience' | 'public_slug'> | null
  clientProfile: Pick<ClientProfile, 'postcode' | 'display_name'> | null
}

export function ProfileForm({ user, tradeProfile, clientProfile }: Props) {
  const isTrade = user.user_type === 'trade' || user.user_type === 'both'

  const [fullName, setFullName] = useState(user.full_name)
  const [postcode, setPostcode] = useState(
    (isTrade ? tradeProfile?.postcode : clientProfile?.postcode) ?? ''
  )
  const [bio, setBio] = useState(tradeProfile?.bio ?? '')
  const [tradeTypes, setTradeTypes] = useState<string[]>(tradeProfile?.trade_types ?? [])
  const [yearsExp, setYearsExp] = useState(
    tradeProfile?.years_experience != null ? String(tradeProfile.years_experience) : ''
  )
  const [displayName, setDisplayName] = useState(clientProfile?.display_name ?? '')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleTradeType(t: string) {
    setTradeTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const parsed = yearsExp !== '' ? parseInt(yearsExp, 10) : null
    const years_experience = parsed !== null && !isNaN(parsed) ? parsed : null

    startTransition(async () => {
      const result = await updateProfile({
        full_name: fullName,
        postcode,
        ...(isTrade
          ? { bio, trade_types: tradeTypes, years_experience }
          : { display_name: displayName }),
      })
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Full name */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">
          Full name
        </label>
        <input
          id="full_name"
          type="text"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          className="w-full min-h-[44px] rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
        />
      </div>

      {/* Email — read only */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
        <input
          type="email"
          value={user.email}
          readOnly
          className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
        />
      </div>

      {/* Phone — read only */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={user.phone ?? 'Not set'}
            readOnly
            className="flex-1 min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
          />
          {user.phone_verified && (
            <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              ✓ Verified
            </span>
          )}
        </div>
      </div>

      {/* Postcode */}
      <div>
        <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1.5">
          Postcode
        </label>
        <input
          id="postcode"
          type="text"
          required
          value={postcode}
          onChange={e => setPostcode(e.target.value.toUpperCase())}
          placeholder="SW1A 1AA"
          autoComplete="postal-code"
          className="w-full min-h-[44px] rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 uppercase focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
        />
      </div>

      {/* Client only: display name */}
      {!isTrade && (
        <div>
          <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Display name
          </label>
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How your name appears to tradespeople"
            className="w-full min-h-[44px] rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
          />
        </div>
      )}

      {/* Trade only fields */}
      {isTrade && (
        <>
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Trade types</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TRADE_TYPES.map(t => (
                <label key={t} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tradeTypes.includes(t)}
                    onChange={() => toggleTradeType(t)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-amber accent-brand-amber"
                  />
                  <span className="text-sm text-gray-700">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="years_exp" className="block text-sm font-medium text-gray-700 mb-1.5">
              Years of experience
            </label>
            <input
              id="years_exp"
              type="number"
              min="0"
              max="60"
              value={yearsExp}
              onChange={e => setYearsExp(e.target.value)}
              placeholder="e.g. 12"
              className="w-full min-h-[44px] rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
              Bio <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="bio"
              rows={4}
              maxLength={500}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell clients about your experience and approach…"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber resize-none"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{bio.length}/500</p>
          </div>

          {tradeProfile?.public_slug && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="mb-1 text-xs text-gray-400">Your public profile</p>
              <a
                href={`/t/${tradeProfile.public_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-brand-amber hover:underline"
              >
                workedwith.co.uk/t/{tradeProfile.public_slug}
              </a>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700">Profile updated.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[48px] rounded-xl bg-brand-amber px-6 text-base font-semibold text-brand-navy hover:bg-amber-400 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
