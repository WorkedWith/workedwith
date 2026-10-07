'use client'

import { useState, useTransition } from 'react'
import { setDistrictBoost, swapDistrictBoost } from '@/actions/boost-districts'
import {
  ADDON_PRICE_TEXT,
  INCLUDED_BOOSTS,
  type BoostChangeResult,
  type BoostSummary,
} from '@/lib/boost-types'

type Props = {
  areaCodes: string[]
  summary: BoostSummary
  onSummary: (s: BoostSummary) => void
  extraDistrictsAvailable: boolean
  unavailableNote: string | null
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'your next renewal'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Switch({ on, disabled, label, onClick }: { on: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        on ? 'bg-brand-amber' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function BoostPanel({ areaCodes, summary, onSummary, extraDistrictsAvailable, unavailableNote }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{ code: string; extraSlots: number } | null>(null)
  const [swapping, setSwapping] = useState<string | null>(null)
  const [swapTarget, setSwapTarget] = useState('')

  const boosted = summary.boosted.filter(c => areaCodes.includes(c))
  const usedPaid = Math.max(0, boosted.length - INCLUDED_BOOSTS)
  const unusedPaid = Math.max(0, summary.paidSlots - usedPaid)
  const atFreeLimit = boosted.length >= INCLUDED_BOOSTS + summary.paidSlots

  function handle(result: BoostChangeResult, code?: string) {
    if (result.status === 'ok') {
      onSummary(result.summary)
      setError(null)
      setPendingConfirm(null)
      setSwapping(null)
      setSwapTarget('')
    } else if (result.status === 'needs_confirm') {
      setPendingConfirm({ code: code ?? '', extraSlots: result.extraSlots })
    } else {
      setError(result.error)
      setPendingConfirm(null)
    }
  }

  function toggle(code: string, on: boolean) {
    setError(null)
    setPendingConfirm(null)
    if (on && atFreeLimit && !extraDistrictsAvailable) {
      setError(unavailableNote ?? 'You have used all of your boosted districts.')
      return
    }
    startTransition(async () => {
      handle(await setDistrictBoost(code, on, false), code)
    })
  }

  function confirmPaid() {
    if (!pendingConfirm) return
    const { code } = pendingConfirm
    startTransition(async () => {
      handle(await setDistrictBoost(code, true, true), code)
    })
  }

  function doSwap(from: string) {
    if (!swapTarget) return
    startTransition(async () => {
      handle(await swapDistrictBoost(from, swapTarget))
    })
  }

  return (
    <div className="rounded-2xl border border-brand-amber/40 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold text-brand-navy">Boosted Districts</h2>
        <span className="rounded-full bg-brand-amber px-2 py-0.5 text-xs font-bold text-brand-navy">Pro</span>
      </div>
      <p className="text-sm text-gray-500">
        Switch a district on to appear at the top of search results there. Your first {INCLUDED_BOOSTS} are included in
        Pro. Each extra one is {ADDON_PRICE_TEXT}, and you can switch it off any time.
      </p>

      <p className="mt-3 text-sm font-medium text-brand-navy">
        {boosted.length} boosted: {Math.min(boosted.length, INCLUDED_BOOSTS)} included
        {usedPaid > 0 ? `, ${usedPaid} paid (${ADDON_PRICE_TEXT} each)` : ''}
      </p>

      {unusedPaid > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            {unusedPaid === 1 ? 'You have 1 paid slot you are not using.' : `You have ${unusedPaid} paid slots you are not using.`}{' '}
            You will stop paying for {unusedPaid === 1 ? 'it' : 'them'} on {fmtDate(summary.renewsOn)}. Switch a boost on
            before then and it is free.
          </p>
        </div>
      )}

      {areaCodes.length === 0 ? (
        <p className="mt-4 text-sm italic text-gray-400">Add operating areas above before boosting a district.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {areaCodes.map(code => {
            const isOn = boosted.includes(code)
            const index = boosted.indexOf(code)
            const isPaidSlot = isOn && index >= INCLUDED_BOOSTS
            const others = areaCodes.filter(c => !boosted.includes(c))
            return (
              <li key={code} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">{code}</p>
                    <p className="text-xs text-gray-500">
                      {isOn ? (isPaidSlot ? `Boosted, paid slot` : 'Boosted, included') : 'Not boosted'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isOn && others.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSwapping(swapping === code ? null : code)
                          setSwapTarget('')
                          setError(null)
                        }}
                        className="text-sm font-medium text-brand-navy underline"
                      >
                        Swap
                      </button>
                    )}
                    <Switch
                      on={isOn}
                      disabled={isPending}
                      label={`Boost ${code}`}
                      onClick={() => toggle(code, !isOn)}
                    />
                  </div>
                </div>

                {swapping === code && (
                  <div className="mt-3 rounded-xl bg-gray-50 p-3">
                    <p className="text-sm text-gray-700">Move this boost to another of your areas. No change to your bill.</p>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={swapTarget}
                        onChange={e => setSwapTarget(e.target.value)}
                        className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                      >
                        <option value="">Choose a district</option>
                        {others.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!swapTarget || isPending}
                        onClick={() => doSwap(code)}
                        className="min-h-[44px] rounded-lg bg-brand-navy px-4 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        Move boost
                      </button>
                    </div>
                  </div>
                )}

                {pendingConfirm?.code === code && (
                  <div className="mt-3 rounded-xl border border-brand-amber/60 bg-amber-50 p-3">
                    <p className="text-sm text-amber-900">
                      Boosting {code} adds {pendingConfirm.extraSlots === 1 ? 'a paid slot' : `${pendingConfirm.extraSlots} paid slots`}{' '}
                      at {ADDON_PRICE_TEXT} {pendingConfirm.extraSlots === 1 ? '' : 'each '}
                      to your plan. Stripe charges the part month today, then {ADDON_PRICE_TEXT}. Switch it off any
                      time and you stop paying at your next renewal.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={confirmPaid}
                        className="min-h-[44px] rounded-lg bg-brand-amber px-4 text-sm font-semibold text-brand-navy disabled:opacity-40"
                      >
                        Confirm and boost
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingConfirm(null)}
                        className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {unavailableNote && atFreeLimit && !error && <p className="mt-3 text-xs text-gray-500">{unavailableNote}</p>}
    </div>
  )
}
