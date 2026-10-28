'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const DISMISS_KEY = 'ww-install-dismissed'

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Registers the service worker and offers "Add to home screen" once, on phones, in the signed in area. */
export function PwaSetup() {
  const pathname = usePathname()
  // Signed in areas only, so public pages stay static
  const signedIn = /^\/(dashboard|org|jobs|requests|profile|settings)/.test(pathname ?? '')
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (!signedIn || isStandalone()) return
    try { if (localStorage.getItem(DISMISS_KEY)) return } catch { /* private mode */ }

    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent) }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) setIosHint(true)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [signedIn])

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setEvent(null); setIosHint(false)
  }

  async function install() {
    if (!event) return
    await event.prompt()
    await event.userChoice.catch(() => null)
    dismiss()
  }

  if (!event && !iosHint) return null
  return (
    <div role="dialog" aria-label="Add WorkedWith to your home screen" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-brand-navy p-4 text-white shadow-2xl sm:hidden">
      <p className="text-sm font-semibold">Add WorkedWith to your home screen</p>
      <p className="mt-1 text-xs text-white/70">
        {event ? 'Open it like an app, straight from your phone.' : 'Tap the Share button, then Add to Home Screen.'}
      </p>
      <div className="mt-3 flex gap-2">
        {event && <button onClick={install} className="min-h-[44px] flex-1 rounded-lg bg-brand-amber px-3 text-sm font-semibold text-brand-navy">Add</button>}
        <button onClick={dismiss} className="min-h-[44px] flex-1 rounded-lg border border-white/30 px-3 text-sm font-medium">Not now</button>
      </div>
    </div>
  )
}
