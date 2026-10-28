'use client'

import { useEffect, useState, useTransition } from 'react'
import QRCode from 'qrcode'
import { setJobLinkPaused } from '@/actions/job-link-settings'

type Props = { url: string; message: string; businessName: string; paused: boolean; visits: number; requests: number }

export function JobLinkCard({ url, message, businessName, paused: initialPaused, visits, requests }: Props) {
  const [paused, setPaused] = useState(initialPaused)
  const [note, setNote] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#0F1F3D', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(null))
  }, [url])

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
      setNote(`${what} copied.`)
    } catch {
      setNote('Could not copy. Select the text and copy it yourself.')
    }
  }

  async function downloadPng() {
    const data = await QRCode.toDataURL(url, { width: 1200, margin: 2, color: { dark: '#0F1F3D', light: '#FFFFFF' } })
    save(data, 'workedwith-job-link.png')
  }
  async function downloadSvg() {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 2, color: { dark: '#0F1F3D', light: '#FFFFFF' } })
    save(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'workedwith-job-link.svg')
  }
  function save(href: string, filename: string) {
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    a.click()
  }

  function togglePause() {
    const next = !paused
    start(async () => {
      const r = await setJobLinkPaused(next)
      if (r.success) { setPaused(next); setNote(next ? 'Link paused.' : 'Link is live again.') }
      else setNote(r.error)
    })
  }

  const enc = encodeURIComponent
  const shares: { label: string; href?: string; onClick?: () => void }[] = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(message)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: 'Instagram', onClick: () => copy(message, 'Message') },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(message)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: 'Email', href: `mailto:?subject=${enc(`Your job with ${businessName}`)}&body=${enc(message)}` },
    { label: 'Text', href: `sms:?&body=${enc(message)}` },
  ]
  const chip = 'inline-flex min-h-[40px] items-center rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50'

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-brand-navy">Your job link</h2>
      <p className="mt-1 text-sm text-gray-600">
        Put this on invoices, your van and your social pages. A client opens it, logs the job, and you accept with one tap. Free on every plan.
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{url}</span>
        <button type="button" onClick={() => copy(url, 'Link')} className="shrink-0 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white">Copy link</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {shares.map(s => s.href
          ? <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={chip}>{s.label}</a>
          : <button key={s.label} type="button" onClick={s.onClick} className={chip}>{s.label}</button>)}
      </div>
      <p className="mt-2 text-xs text-gray-400">Instagram copies the message. Paste it into your bio or a story.</p>

      <div className="mt-4 flex items-start gap-4">
        {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={qr} alt="QR code for your job link" width={110} height={110} className="rounded-lg border border-gray-200" />}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">QR code for invoices, business cards and vans.</p>
          <div className="flex gap-2">
            <button type="button" onClick={downloadPng} className={chip}>Download PNG</button>
            <button type="button" onClick={downloadSvg} className={chip}>Download SVG</button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Message to paste</p>
        <p className="mt-1 text-sm text-gray-700">{message}</p>
        <button type="button" onClick={() => copy(message, 'Message')} className="mt-2 text-xs font-semibold text-brand-navy underline">Copy message</button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <p className="text-sm text-gray-600">Last 30 days: <strong>{visits}</strong> visit{visits === 1 ? '' : 's'}, <strong>{requests}</strong> job{requests === 1 ? '' : 's'} logged</p>
        <button type="button" onClick={togglePause} disabled={pending}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {paused ? 'Turn the link back on' : 'Pause link'}
        </button>
      </div>
      {paused && <p className="mt-2 text-xs text-amber-700">Your link is paused. Visitors see that you are not taking new job records.</p>}
      {note && <p className="mt-2 text-xs text-gray-500" role="status">{note}</p>}
    </section>
  )
}
