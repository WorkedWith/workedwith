'use client'

import { useEffect, useState, useTransition } from 'react'
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

type Step = 'menu' | 'swap' | 'swapfrom' | 'confirm'

function fmtDate(iso: string | null): string {
  if (!iso) return 'your next renewal'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function BoostPanel({ areaCodes, summary, onSummary, extraDistrictsAvailable, unavailableNote }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('menu')
  const [extraSlots, setExtraSlots] = useState(1)
  const [swapTarget, setSwapTarget] = useState('')
  const [swapSource, setSwapSource] = useState('')
  const [error, setError] = useState<string | null>(null)

  const boosted = summary.boosted.filter(c => areaCodes.includes(c))
  const usedPaid = Math.max(0, boosted.length - INCLUDED_BOOSTS)
  const unusedPaid = Math.max(0, summary.paidSlots - usedPaid)
  const atFreeLimit = boosted.length >= INCLUDED_BOOSTS + summary.paidSlots
  const includedUsed = Math.min(boosted.length, INCLUDED_BOOSTS)

  function close() {
    setSelected(null)
    setStep('menu')
    setSwapTarget('')
    setSwapSource('')
    setError(null)
  }

  useEffect(() => {
    if (!selected) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected])

  function open(code: string) {
    setSelected(code)
    setStep('menu')
    setSwapTarget('')
    setSwapSource('')
    setError(null)
  }

  function handle(result: BoostChangeResult) {
    if (result.status === 'ok') {
      onSummary(result.summary)
      close()
    } else if (result.status === 'needs_confirm') {
      setExtraSlots(result.extraSlots)
      setStep('confirm')
    } else {
      setError(result.error)
    }
  }

  function boost(confirmed: boolean) {
    if (!selected) return
    const code = selected
    setError(null)
    if (!confirmed && atFreeLimit && !extraDistrictsAvailable) {
      setError(unavailableNote ?? 'You have used all of your boosted districts.')
      return
    }
    startTransition(async () => {
      handle(await setDistrictBoost(code, true, confirmed))
    })
  }

  function unboost() {
    if (!selected) return
    const code = selected
    setError(null)
    startTransition(async () => {
      handle(await setDistrictBoost(code, false, false))
    })
  }

  function swap() {
    if (!selected || !swapTarget) return
    const from = selected
    setError(null)
    startTransition(async () => {
      handle(await swapDistrictBoost(from, swapTarget))
    })
  }

  function swapIn() {
    if (!selected || !swapSource) return
    const to = selected
    setError(null)
    startTransition(async () => {
      handle(await swapDistrictBoost(swapSource, to))
    })
  }

  const isOn = selected ? boosted.includes(selected) : false
  const isPaidSlot = selected ? isOn && boosted.indexOf(selected) >= INCLUDED_BOOSTS : false
  const others = areaCodes.filter(c => !boosted.includes(c))

  return (
    <div className="rounded-2xl border border-brand-amber/40 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-base font-semibold text-brand-navy">Boosted Districts</h2>
        <span className="rounded-full bg-brand-amber px-2 py-0.5 text-xs font-bold text-brand-navy">Pro</span>
      </div>
      <p className="text-sm text-gray-500">
        Tap a district to boost it and appear at the top of search results there. Your first {INCLUDED_BOOSTS} are
        included in Pro. Each extra one is {ADDON_PRICE_TEXT}, and you can remove it any time.
      </p>

      <p className="mt-3 text-sm font-medium text-brand-navy">
        {includedUsed} of {INCLUDED_BOOSTS} included boosts used
        {usedPaid > 0 ? `, ${usedPaid} paid (${ADDON_PRICE_TEXT} each)` : ''}
      </p>

      {unusedPaid > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            {unusedPaid === 1 ? 'You have 1 paid slot you are not using.' : `You have ${unusedPaid} paid slots you are not using.`}{' '}
            You will stop paying for {unusedPaid === 1 ? 'it' : 'them'} on {fmtDate(summary.renewsOn)}. Boost a district
            before then and it is free.
          </p>
        </div>
      )}

      {areaCodes.length === 0 ? (
        <p className="mt-4 text-sm italic text-gray-400">Add and save operating areas above before boosting a district.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {areaCodes.map(code => {
            const on = boosted.includes(code)
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => open(code)}
                  aria-haspopup="dialog"
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
                    on
                      ? 'border-brand-amber bg-amber-50 text-brand-navy'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {on && <span aria-hidden="true">⚡</span>}
                  {code}
                  {on && <span className="text-xs font-medium text-amber-800">Boosted</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {unavailableNote && atFreeLimit && <p className="mt-3 text-xs text-gray-500">{unavailableNote}</p>}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Boost ${selected}`}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-brand-navy">{selected}</h3>
                <p className="text-sm text-gray-500">
                  {isOn ? (isPaidSlot ? 'Boosted, paid slot' : 'Boosted, included in Pro') : 'Not boosted'}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-gray-400 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {step === 'menu' && !isOn && (
              <div className="mt-4 space-y-3">
                {boosted.length > 0 && (
                  <p className="text-sm font-medium text-brand-navy">
                    You already boost {boosted.join(', ')}. What would you like to do with {selected}?
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  {!atFreeLimit
                    ? unusedPaid > 0 && boosted.length >= INCLUDED_BOOSTS
                      ? `Adding it uses a slot you have already paid for, so it costs nothing extra until ${fmtDate(summary.renewsOn)}.`
                      : 'Adding it uses one of your included boosts. No extra cost.'
                    : `Adding it takes a paid slot at ${ADDON_PRICE_TEXT}. You will see the exact charge before anything is taken.`}
                </p>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => boost(false)}
                  className="min-h-[48px] w-full rounded-xl bg-brand-amber px-4 text-base font-semibold text-brand-navy disabled:opacity-40"
                >
                  {isPending ? 'Working…' : boosted.length > 0 ? `Add ${selected} as an extra boost` : 'Boost this district'}
                </button>
                {boosted.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep('swapfrom')}
                    className="min-h-[48px] w-full rounded-xl border-2 border-brand-navy px-4 text-base font-semibold text-brand-navy"
                  >
                    Swap with a boosted district instead
                  </button>
                )}
              </div>
            )}

            {step === 'swapfrom' && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Boost {selected} and stop boosting one of your current districts. No change to your bill.
                </p>
                <select
                  value={swapSource}
                  onChange={e => setSwapSource(e.target.value)}
                  className="min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base"
                >
                  <option value="">Which boost should it replace?</option>
                  {boosted.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!swapSource || isPending}
                    onClick={swapIn}
                    className="min-h-[48px] flex-1 rounded-xl bg-brand-navy px-4 text-base font-semibold text-white disabled:opacity-40"
                  >
                    {isPending ? 'Working…' : 'Swap boost'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('menu')}
                    className="min-h-[48px] rounded-xl border border-gray-300 px-4 text-base font-medium text-gray-700"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {step === 'menu' && isOn && (
              <div className="mt-4 space-y-3">
                {others.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep('swap')}
                    className="min-h-[48px] w-full rounded-xl border-2 border-brand-navy px-4 text-base font-semibold text-brand-navy"
                  >
                    Swap to another district
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={unboost}
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 px-4 text-base font-semibold text-gray-700 disabled:opacity-40"
                >
                  {isPending ? 'Working…' : 'Remove boost'}
                </button>
                {isPaidSlot && (
                  <p className="text-xs text-gray-500">
                    You keep this slot until {fmtDate(summary.renewsOn)}, then stop paying for it.
                  </p>
                )}
              </div>
            )}

            {step === 'swap' && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600">Move this boost to another of your areas. No change to your bill.</p>
                <select
                  value={swapTarget}
                  onChange={e => setSwapTarget(e.target.value)}
                  className="min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base"
                >
                  <option value="">Choose a district</option>
                  {others.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!swapTarget || isPending}
                    onClick={swap}
                    className="min-h-[48px] flex-1 rounded-xl bg-brand-navy px-4 text-base font-semibold text-white disabled:opacity-40"
                  >
                    {isPending ? 'Working…' : 'Move boost'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('menu')}
                    className="min-h-[48px] rounded-xl border border-gray-300 px-4 text-base font-medium text-gray-700"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {step === 'confirm' && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-brand-amber/60 bg-amber-50 p-3">
                  <p className="text-sm text-amber-900">
                    Boosting {selected} adds {extraSlots === 1 ? 'a paid slot' : `${extraSlots} paid slots`} at{' '}
                    {ADDON_PRICE_TEXT}{extraSlots === 1 ? '' : ' each'} to your plan. Stripe charges the part month
                    today, then {ADDON_PRICE_TEXT}. Remove it any time and you stop paying at your next renewal.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => boost(true)}
                    className="min-h-[48px] flex-1 rounded-xl bg-brand-amber px-4 text-base font-semibold text-brand-navy disabled:opacity-40"
                  >
                    {isPending ? 'Working…' : 'Confirm and boost'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('menu')}
                    className="min-h-[48px] rounded-xl border border-gray-300 px-4 text-base font-medium text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
