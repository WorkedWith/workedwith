'use client'

import { useState, useTransition } from 'react'
import { updateBoostedAddonQuantity } from '@/actions/update-boosted-addon-quantity'

type Props = {
  currentAddonQty: number
  activeBoostedCount: number
  canDecrease: boolean
  cooldownMessage: string | null  // non-null when decrease is on cooldown
}

const ADDON_MAX = 17

export function BoostedAddonManager({
  currentAddonQty,
  activeBoostedCount,
  canDecrease,
  cooldownMessage,
}: Props) {
  const [addonQty, setAddonQty] = useState(currentAddonQty)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalMax = 3 + addonQty
  const canAdd = addonQty < ADDON_MAX
  const wouldDropBelowActive = addonQty - 1 < 0 || activeBoostedCount > 3 + (addonQty - 1)

  function handleChange(delta: 1 | -1) {
    const newQty = addonQty + delta
    setError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await updateBoostedAddonQuantity(newQty)
      if (result.success) {
        setAddonQty(result.newQty)
        setSuccessMsg(delta > 0 ? 'Slot added — Stripe will prorate the charge.' : 'Slot removed.')
        setTimeout(() => setSuccessMsg(null), 5000)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-brand-amber/40 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold text-brand-navy">Boosted District Slots</h2>
        <span className="rounded-full bg-brand-amber px-2 py-0.5 text-xs font-bold text-brand-navy">Pro add-on</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        3 districts included with Pro. Additional slots are £10/month each — Stripe prorates
        mid-cycle additions. Removing a slot is subject to the same 30-day cooldown as district changes.
      </p>

      {/* Current state summary */}
      <div className="mb-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total allowed</p>
            <p className="mt-0.5 text-2xl font-bold text-brand-navy">{totalMax} districts</p>
            <p className="text-xs text-gray-500 mt-0.5">
              3 included + {addonQty} add-on{addonQty !== 1 ? 's' : ''} · {activeBoostedCount} currently boosted
            </p>
          </div>
          {addonQty > 0 && (
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Add-on cost</p>
              <p className="mt-0.5 text-lg font-bold text-brand-navy">£{addonQty * 10}/mo</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {/* Add */}
        <button
          type="button"
          onClick={() => handleChange(1)}
          disabled={isPending || !canAdd}
          className="flex-1 rounded-lg border-2 border-brand-navy bg-white px-4 py-3 text-sm font-semibold text-brand-navy
            transition-opacity hover:bg-brand-navy hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? '…' : '+ Add slot'}{canAdd ? ' (£10/mo)' : ' (max reached)'}
        </button>

        {/* Remove */}
        {addonQty > 0 && (
          <button
            type="button"
            onClick={() => handleChange(-1)}
            disabled={isPending || !canDecrease || wouldDropBelowActive}
            title={
              !canDecrease ? (cooldownMessage ?? 'Cooldown active') :
              wouldDropBelowActive ? `Deselect a Boosted District first` :
              undefined
            }
            className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700
              transition-colors hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? '…' : '− Remove slot'}
          </button>
        )}
      </div>

      {/* Cooldown notice for decrease */}
      {cooldownMessage && addonQty > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          <span className="font-semibold">Cooldown:</span> {cooldownMessage}
        </p>
      )}

      {/* Active-boost block notice */}
      {!cooldownMessage && wouldDropBelowActive && addonQty > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          You have {activeBoostedCount} Boosted District{activeBoostedCount !== 1 ? 's' : ''} active.{' '}
          <a href="/profile/areas" className="font-semibold text-brand-amber hover:underline">
            Reduce your selection
          </a>{' '}
          to {3 + (addonQty - 1)} or fewer before removing a slot.
        </p>
      )}

      {successMsg && <p className="mt-3 text-sm font-medium text-green-700">{successMsg}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
