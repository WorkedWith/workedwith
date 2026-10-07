'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClientProfile } from '@/actions/create-client-profile'
import { suggestUsername, validateUsername, USERNAME_HELP } from '@/lib/username'

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i

type FieldErrors = { full_name?: string; postcode?: string; username?: string }

export function ClientIndividualForm({ initialFullName }: { initialFullName: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState(initialFullName)
  const [postcode, setPostcode] = useState('')
  const [username, setUsername] = useState(() => suggestUsername(initialFullName))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!fullName.trim()) errors.full_name = 'Please enter your full name.'
    if (!postcode.trim()) {
      errors.postcode = 'Please enter your postcode.'
    } else if (!UK_POSTCODE_RE.test(postcode.trim())) {
      errors.postcode = 'Please enter a valid UK postcode.'
    }
    const u = validateUsername(username)
    if (u.error) errors.username = u.error
    return errors
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setGlobalError(null)
    startTransition(async () => {
      const result = await createClientProfile({ full_name: fullName, postcode, username })
      if (result.success) {
        router.push('/dashboard')
      } else {
        if (result.field) {
          setFieldErrors({ [result.field]: result.error })
        } else {
          setGlobalError(result.error)
        }
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-brand-navy mb-1">Your details</h2>
      <p className="text-sm text-gray-500 mb-6">Confirm your name and location to get started.</p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Full name */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Full name<span className="ml-0.5 text-red-500">*</span>
            </label>
          </div>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              setFieldErrors((prev) => ({ ...prev, full_name: undefined }))
            }}
            placeholder="Your full name"
            className={inputClass(!!fieldErrors.full_name)}
          />
          {fieldErrors.full_name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.full_name}</p>
          )}
        </div>

        {/* Postcode */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
              Postcode<span className="ml-0.5 text-red-500">*</span>
            </label>
          </div>
          <input
            id="postcode"
            type="text"
            autoComplete="postal-code"
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value)
              setFieldErrors((prev) => ({ ...prev, postcode: undefined }))
            }}
            placeholder="SW1A 1AA"
            className={inputClass(!!fieldErrors.postcode)}
          />
          {fieldErrors.postcode && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.postcode}</p>
          )}
        </div>

        {/* Username */}
        <div className="mt-4 rounded-xl border border-brand-amber/50 bg-amber-50 p-4">
          <label htmlFor="username" className="block text-sm font-semibold text-brand-navy mb-1.5">
            Choose your WorkedWith username<span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="username"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setFieldErrors((prev) => ({ ...prev, username: undefined }))
            }}
            className={inputClass(!!fieldErrors.username)}
          />
          {fieldErrors.username ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">{USERNAME_HELP}</p>
          )}
          <p className="mt-3 text-sm text-amber-900 leading-relaxed">
            <strong>Remember this.</strong> Tradespeople use your username to find your profile, so you will
            give it to them when you hire someone. You can see it on your dashboard at any time.
          </p>
        </div>

        {globalError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {globalError}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Creating profile…' : 'Complete profile'}
        </button>
      </form>
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-4 py-3 text-base
    focus:outline-none focus:ring-2 focus:border-transparent
    ${hasError
      ? 'border-red-400 focus:ring-red-400'
      : 'border-gray-300 focus:ring-brand-amber'
    }`
}
