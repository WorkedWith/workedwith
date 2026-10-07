'use client'

import { useState } from 'react'

export function CopyClaimLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this claim link', url)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? 'Copied' : 'Copy claim link'}
    </button>
  )
}
