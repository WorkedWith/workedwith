'use client'

import { useState, useTransition } from 'react'
import { OperatingAreasPicker } from '@/components/operating-areas-picker'
import { updateOperatingAreas } from '@/actions/update-operating-areas'
import { updateBoostedDistricts } from '@/actions/update-boosted-districts'
import type { DistrictEntry } from '@/actions/resolve-district'

type Props = {
  initialAreas: DistrictEntry[]
  isPro: boolean
  initialBoostedDistricts: string[]
  canUpdateBoosts: boolean
  nextRenewalDate: string | null
  maxBoosts: number
}

export function AreasForm({
  initialAreas,
  isPro,
  initialBoostedDistricts,
  canUpdateBoosts,
  nextRenewalDate,
  maxBoosts,
}: Props) {
  // ── Operating Areas state ─────────────────────────────────
  const [areas, setAreas] = useState<DistrictEntry[]>(initialAreas)
  const [areaSaveState, setAreaSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [areaError, setAreaError] = useState<string | null>(null)
  const [isAreaPending, startAreaTransition] = useTransition()

  // ── Boosted Districts state ───────────────────────────────
  const [boostedDistricts, setBoostedDistricts] = useState<string[]>(initialBoostedDistricts)
  const [boostSaveState, setBoostSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [boostError, setBoostError] = useState<string | null>(null)
  const [isBoostPending, startBoostTransition] = useTransition()

  function handleSaveAreas() {
    startAreaTransition(async () => {
      setAreaSaveState('saving')
      setAreaError(null)
      const result = await updateOperatingAreas(areas.map(a => a.code))
      if (result.success) {
        // Mirror the server-side cascade locally so boost picker stays consistent
        const areaCodes = areas.map(a => a.code)
        setBoostedDistricts(prev => prev.filter(d => areaCodes.includes(d)))
        setAreaSaveState('saved')
        setTimeout(() => setAreaSaveState('idle'), 3000)
      } else {
        setAreaSaveState('error')
        setAreaError(result.error)
      }
    })
  }

  function handleSaveBoosts() {
    startBoostTransition(async () => {
      setBoostSaveState('saving')
      setBoostError(null)
      const result = await updateBoostedDistricts(boostedDistricts)
      if (result.success) {
        setBoostSaveState('saved')
        setTimeout(() => setBoostSaveState('idle'), 3000)
      } else {
        setBoostSaveState('error')
        setBoostError(result.error)
      }
    })
  }

  function toggleBoost(code: string) {
    setBoostedDistricts(prev => {
      if (prev.includes(code)) return prev.filter(c => c !== code)
      if (prev.length >= maxBoosts) return prev
      return [...prev, code]
    })
  }

  const areaCodes = areas.map(a => a.code)

  return (
    <div className="space-y-6">

      {/* ── Operating Areas ─────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-brand-navy mb-1">Operating Areas</h2>
        <p className="text-sm text-gray-500 mb-4">
          Clients searching in these postcode districts will find your profile.
        </p>

        <OperatingAreasPicker value={areas} onChange={setAreas} />

        {areaError && (
          <p className="mt-3 text-sm text-red-600">{areaError}</p>
        )}

        <button
          type="button"
          onClick={handleSaveAreas}
          disabled={isAreaPending}
          className="mt-5 w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {areaSaveState === 'saving' ? 'Saving…' : areaSaveState === 'saved' ? 'Saved!' : 'Save operating areas'}
        </button>
      </div>

      {/* ── Boosted Districts (Pro only) ─────────────────── */}
      {isPro && (
        <div className="rounded-2xl border border-brand-amber/40 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-brand-navy">Boosted Districts</h2>
            <span className="rounded-full bg-brand-amber px-2 py-0.5 text-xs font-bold text-brand-navy">Pro</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Select up to {maxBoosts} district{maxBoosts !== 1 ? 's' : ''} from your Operating Areas. Your profile will appear in the
            top band of search results for those districts. One change allowed per billing cycle.
          </p>

          {areaCodes.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Add Operating Areas above before selecting Boosted Districts.
            </p>
          ) : !canUpdateBoosts ? (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-700">Cooldown active</p>
              <p className="mt-1 text-sm text-gray-500">
                You have already updated your Boosted Districts this billing cycle.
                {nextRenewalDate && ` You can change them again from ${nextRenewalDate}.`}
              </p>
              {/* Show current selection read-only */}
              {boostedDistricts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {boostedDistricts.map(code => (
                    <span
                      key={code}
                      className="rounded-full bg-brand-amber/20 px-3 py-1 text-sm font-medium text-brand-navy"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {areaCodes.map(code => {
                  const isSelected = boostedDistricts.includes(code)
                  const atLimit = !isSelected && boostedDistricts.length >= maxBoosts
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleBoost(code)}
                      disabled={atLimit}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-brand-amber text-brand-navy'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {code}
                    </button>
                  )
                })}
              </div>

              <p className="mt-2 text-xs text-gray-400">
                {boostedDistricts.length} / {maxBoosts} districts boosted
                {boostedDistricts.length === maxBoosts && ', deselect one to choose another'}
              </p>

              {boostError && (
                <p className="mt-3 text-sm text-red-600">{boostError}</p>
              )}

              <button
                type="button"
                onClick={handleSaveBoosts}
                disabled={isBoostPending}
                className="mt-5 w-full rounded-lg bg-brand-navy px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {boostSaveState === 'saving' ? 'Saving…' : boostSaveState === 'saved' ? 'Saved!' : 'Save boosted districts'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
