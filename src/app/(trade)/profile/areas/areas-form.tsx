'use client'

import { useState, useTransition } from 'react'
import { OperatingAreasPicker } from '@/components/operating-areas-picker'
import { updateOperatingAreas } from '@/actions/update-operating-areas'
import type { DistrictEntry } from '@/actions/resolve-district'
import type { BoostSummary } from '@/lib/boost-types'
import { BoostPanel } from './boost-panel'

type Props = {
  initialAreas: DistrictEntry[]
  isPro: boolean
  initialBoost: BoostSummary
  extraDistrictsAvailable: boolean
  unavailableNote: string | null
}

export function AreasForm({ initialAreas, isPro, initialBoost, extraDistrictsAvailable, unavailableNote }: Props) {
  const [areas, setAreas] = useState<DistrictEntry[]>(initialAreas)
  const [savedAreaCodes, setSavedAreaCodes] = useState<string[]>(initialAreas.map(a => a.code))
  const [boost, setBoost] = useState<BoostSummary>(initialBoost)
  const [areaSaveState, setAreaSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [areaError, setAreaError] = useState<string | null>(null)
  const [isAreaPending, startAreaTransition] = useTransition()

  function handleSaveAreas() {
    startAreaTransition(async () => {
      setAreaSaveState('saving')
      setAreaError(null)
      const codes = areas.map(a => a.code)
      const result = await updateOperatingAreas(codes)
      if (result.success) {
        setSavedAreaCodes(codes)
        if (result.boost) setBoost(result.boost)
        setAreaSaveState('saved')
        setTimeout(() => setAreaSaveState('idle'), 3000)
      } else {
        setAreaSaveState('error')
        setAreaError(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-brand-navy mb-1">Operating Areas</h2>
        <p className="text-sm text-gray-500 mb-4">
          Clients searching in these postcode districts will find your profile.
        </p>

        <OperatingAreasPicker value={areas} onChange={setAreas} />

        {areaError && <p className="mt-3 text-sm text-red-600">{areaError}</p>}

        {isPro && boost.boosted.some(d => !areas.some(a => a.code === d)) && (
          <p className="mt-3 text-sm text-amber-700">
            You have removed a boosted district. Saving will switch its boost off.
          </p>
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

      {isPro && (
        <BoostPanel
          areaCodes={savedAreaCodes}
          summary={boost}
          onSummary={setBoost}
          extraDistrictsAvailable={extraDistrictsAvailable}
          unavailableNote={unavailableNote}
        />
      )}
    </div>
  )
}
