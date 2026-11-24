'use client'

import { useState, useTransition } from 'react'
import { joinBoostWaitlist, setDistrictBoost, swapDistrictBoost } from '@/actions/boost-districts'
import { ADDON_PRICE_TEXT, type BoostChangeResult, type BoostSummary } from '@/lib/boost-types'

type Props = {
  areaCodes: string[]
  summary: BoostSummary
  onSummary: (s: BoostSummary) => void
  enabledDistricts: string[]
}

type Sheet =
  | { step: 'menu'; code: string }
  | { step: 'swap'; code: string }
  | { step: 'confirm'; code: string; extra: number }
  | { step: 'full'; code: string; tradeTypes: string[]; joined: boolean }

function fmtDate(iso: string | null): string {
  if (!iso) return 'your next renewal'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const btnPrimary = 'min-h-[48px] w-full rounded-xl bg-brand-amber px-4 text-base font-semibold text-brand-navy disabled:opacity-40'
const btnOutline = 'min-h-[48px] w-full rounded-xl border-2 border-brand-navy px-4 text-base font-semibold text-brand-navy disabled:opacity-40'

export function BoostPanel({ areaCodes, summary, onSummary, enabledDistricts }: Props) {
  const [isPending, startTransition] = useTransition()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [swapTarget, setSwapTarget] = useState('')
  const [error, setError] = useState<string | null>(null)

  const boosted = summary.boosted.filter(c => areaCodes.includes(c))
  const unusedPaid = Math.max(0, summary.paidSlots - boosted.length)

  function close() {
    setSheet(null)
    setSwapTarget('')
    setError(null)
  }

  function handle(code: string, result: BoostChangeResult) {
    if (result.status === 'ok') {
      onSummary(result.summary)
      close()
    } else if (result.status === 'needs_confirm') {
      setSheet({ step: 'confirm', code, extra: result.extraSlots })
    } else if (result.status === 'full') {
      setSheet({ step: 'full', code, tradeTypes: result.tradeTypes, joined: false })
    } else {
      setError(result.error)
    }
  }

  function run(code: string, fn: () => Promise<BoostChangeResult>) {
    setError(null)
    startTransition(async () => handle(code, await fn()))
  }

  function joinWaitlist(code: string, tradeTypes: string[]) {
    setError(null)
    startTransition(async () => {
      const r = await joinBoostWaitlist(code, tradeTypes)
      if (r.ok) setSheet({ step: 'full', code, tradeTypes, joined: true })
      else setError(r.error)
    })
  }

  const others = areaCodes.filter(c => !boosted.includes(c) && enabledDistricts.includes(c))

  return (
    <div className="rounded-2xl border border-brand-amber/40 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-brand-navy">Boosted Districts</h2>
      <p className="mt-1 text-sm text-gray-600">
        Appear in the labelled Boosted band at the top of Find for a district. {ADDON_PRICE_TEXT} per district, added to
        your plan. Up to 3 trades per trade type in each district. Reviews and scores are never affected.
      </p>
      <p className="mt-3 text-sm font-medium text-brand-navy">
        {boosted.length === 0 ? 'You are not boosting any districts.' : `Boosting ${boosted.length}: ${boosted.join(', ')}`}
      </p>

      {unusedPaid > 0 && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          You have {unusedPaid === 1 ? '1 paid slot' : `${unusedPaid} paid slots`} you are not using until {fmtDate(summary.renewsOn)}.
          Boost a district before then and it costs nothing extra.
        </p>
      )}

      {areaCodes.length === 0 ? (
        <p className="mt-4 text-sm italic text-gray-400">Add and save operating areas above before boosting a district.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {areaCodes.map(code => {
            const on = boosted.includes(code)
            const available = enabledDistricts.includes(code)
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => available || on ? setSheet({ step: 'menu', code }) : setError(`Boosts are not available in ${code} yet. We switch them on once clients are searching there.`)}
                  aria-haspopup="dialog"
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold ${
                    on ? 'border-brand-amber bg-amber-50 text-brand-navy'
                      : available ? 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        : 'border-dashed border-gray-200 bg-gray-50 text-gray-400'
                  }`}
                >
                  {code}
                  {on && <span className="text-xs font-medium text-amber-800">Boosted</span>}
                  {!on && !available && <span className="text-xs font-normal">Not yet</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {error && !sheet && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Boost ${sheet.code}`}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-brand-navy">{sheet.code}</h3>
              <button type="button" onClick={close} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-gray-400 hover:bg-gray-100">×</button>
            </div>

            {sheet.step === 'menu' && !boosted.includes(sheet.code) && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-gray-600">
                  {unusedPaid > 0
                    ? `This uses a slot you have already paid for, so nothing extra until ${fmtDate(summary.renewsOn)}.`
                    : `Boosting adds ${ADDON_PRICE_TEXT} to your plan. You will see the charge before anything is taken.`}
                </p>
                <button type="button" disabled={isPending} onClick={() => run(sheet.code, () => setDistrictBoost(sheet.code, true, false))} className={btnPrimary}>
                  {isPending ? 'Working…' : 'Boost this district'}
                </button>
              </div>
            )}

            {sheet.step === 'menu' && boosted.includes(sheet.code) && (
              <div className="mt-3 space-y-3">
                {others.length > 0 && (
                  <button type="button" onClick={() => setSheet({ step: 'swap', code: sheet.code })} className={btnOutline}>
                    Move this boost to another district
                  </button>
                )}
                <button type="button" disabled={isPending} onClick={() => run(sheet.code, () => setDistrictBoost(sheet.code, false, false))} className="min-h-[48px] w-full rounded-xl border border-gray-300 px-4 text-base font-semibold text-gray-700 disabled:opacity-40">
                  {isPending ? 'Working…' : 'Remove boost'}
                </button>
                <p className="text-xs text-gray-500">You keep the slot until {fmtDate(summary.renewsOn)}, then stop paying for it.</p>
              </div>
            )}

            {sheet.step === 'swap' && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-gray-600">Move this boost to another of your districts. No change to your bill.</p>
                <select value={swapTarget} onChange={e => setSwapTarget(e.target.value)} className="min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base">
                  <option value="">Choose a district</option>
                  {others.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" disabled={!swapTarget || isPending} onClick={() => run(sheet.code, () => swapDistrictBoost(sheet.code, swapTarget))} className={btnPrimary}>
                  {isPending ? 'Working…' : 'Move boost'}
                </button>
              </div>
            )}

            {sheet.step === 'confirm' && (
              <div className="mt-3 space-y-3">
                <p className="rounded-xl border border-brand-amber/60 bg-amber-50 p-3 text-sm text-amber-900">
                  Boosting {sheet.code} adds {ADDON_PRICE_TEXT} to your plan. Stripe charges the part month today, then
                  {' '}{ADDON_PRICE_TEXT}. Remove it any time and you stop paying at your next renewal.
                </p>
                <button type="button" disabled={isPending} onClick={() => run(sheet.code, () => setDistrictBoost(sheet.code, true, true))} className={btnPrimary}>
                  {isPending ? 'Working…' : 'Confirm and boost'}
                </button>
              </div>
            )}

            {sheet.step === 'full' && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-gray-600">
                  All 3 Boosted slots for {sheet.tradeTypes.join(' and ')} in {sheet.code} are taken.
                  {sheet.joined ? ' You are on the waiting list. We will email you when a slot comes up.' : ' Join the waiting list and we will tell you when one comes up.'}
                </p>
                {!sheet.joined && (
                  <button type="button" disabled={isPending} onClick={() => joinWaitlist(sheet.code, sheet.tradeTypes)} className={btnPrimary}>
                    {isPending ? 'Working…' : 'Join the waiting list'}
                  </button>
                )}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
