'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export function ClientLookupForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedEmail && !trimmedPhone) {
      setError('Enter an email address or mobile number.')
      return
    }

    setError('')

    if (trimmedEmail) {
      router.push(`/search?email=${encodeURIComponent(trimmedEmail)}`)
    } else {
      router.push(`/search?phone=${encodeURIComponent(trimmedPhone)}`)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-brand-navy mb-1">Look up a client</p>
      <p className="text-xs text-gray-500 mb-4">Search by email or mobile number before you commit to a quote.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address"
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
        />
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Mobile number"
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-brand-navy placeholder-gray-400 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          className="h-11 w-full rounded-lg bg-brand-amber px-4 text-sm font-bold text-brand-navy hover:bg-amber-400 transition-colors"
        >
          Search
        </button>
      </form>
    </div>
  )
}
