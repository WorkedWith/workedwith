'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/actions/sign-out'

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setFullName(String(data.full_name ?? ''))
        })
    })
  }, [])

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || '…'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-brand-navy hover:bg-amber-400 transition-colors"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
          {fullName && (
            <>
              <div className="px-4 py-2">
                <p className="truncate text-xs font-medium text-gray-400">{fullName}</p>
              </div>
              <div className="my-1 border-t border-gray-100" />
            </>
          )}
          <a
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            My profile
          </a>
          <a
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Settings
          </a>
          <a
            href="/faq"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            FAQ
          </a>
          <div className="my-1 border-t border-gray-100" />
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
