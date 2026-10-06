'use client'

import { useState, useTransition } from 'react'
import { resolveDistrict, type DistrictEntry } from '@/actions/resolve-district'

type Props = {
  value: DistrictEntry[]
  onChange: (entries: DistrictEntry[]) => void
  maxAreas?: number
}

export function OperatingAreasPicker({ value, onChange, maxAreas = 20 }: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const atLimit = value.length >= maxAreas

  function handleAdd() {
    if (!query.trim()) return
    if (atLimit) {
      setError(`You can add up to ${maxAreas} operating areas.`)
      return
    }
    startTransition(async () => {
      setError(null)
      const result = await resolveDistrict(query)
      if (!result.success) {
        setError(result.error)
        return
      }
      const { entry } = result
      if (value.some(e => e.code === entry.code)) {
        setError(`${entry.code} is already in your list.`)
        return
      }
      onChange([...value, entry])
      setQuery('')
    })
  }

  function handleRemove(code: string) {
    onChange(value.filter(e => e.code !== code))
    setError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          placeholder="Postcode, district (e.g. M20), or place name"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent disabled:bg-gray-50"
          disabled={isPending || atLimit}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !query.trim() || atLimit}
          className="rounded-lg bg-brand-navy px-4 py-3 text-sm font-semibold text-white whitespace-nowrap hover:bg-brand-navy/90 disabled:opacity-40 transition-opacity"
        >
          {isPending ? 'Adding…' : 'Add'}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
      {atLimit && (
        <p className="mt-2 text-xs text-gray-400">
          Maximum of {maxAreas} areas reached. Remove one to add another.
        </p>
      )}

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map(entry => (
            <span
              key={entry.code}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy/10 px-3 py-1.5 text-sm font-medium text-brand-navy"
            >
              <span className="font-bold">{entry.code}</span>
              {entry.adminDistrict && (
                <span className="font-normal text-gray-500">· {entry.adminDistrict}</span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(entry.code)}
                className="ml-0.5 rounded-full text-gray-400 hover:text-red-500 transition-colors leading-none"
                aria-label={`Remove ${entry.code}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400">
        {value.length} / {maxAreas} areas
      </p>
    </div>
  )
}
