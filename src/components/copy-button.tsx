'use client'

import { useState } from 'react'

/** One tap copy, for pasting bank details into a banking app on the same phone (PRD 5, 9). */
export function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="break-all text-base font-semibold tabular-nums text-gray-900">{display ?? value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            setCopied(false)
          }
        }}
        className="min-h-[44px] shrink-0 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-brand-navy hover:bg-gray-50"
        aria-label={`Copy ${label}`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
