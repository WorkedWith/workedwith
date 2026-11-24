import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react'

/** Small shared UI pieces for v4.2 screens. Large touch targets (48px) for phone use. */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</section>
}

export function PageShell({ children, width = 'max-w-2xl' }: { children: ReactNode; width?: string }) {
  return <main className={`mx-auto ${width} space-y-5 px-4 pb-28 pt-6 sm:px-6 lg:pb-12`}>{children}</main>
}

export function PageTitle({ title, sub, back }: { title: string; sub?: string; back?: { href: string; label: string } }) {
  return (
    <div>
      {back && <a href={back.href} className="inline-flex min-h-[44px] items-center text-sm font-medium text-gray-500 hover:text-brand-navy">‹ {back.label}</a>}
      <h1 className="text-2xl font-bold text-brand-navy">{title}</h1>
      {sub && <p className="mt-1 text-sm text-gray-600">{sub}</p>}
    </div>
  )
}

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block">
      <span className="block text-sm font-medium text-gray-800">{children}</span>
      {hint && <span className="mt-0.5 block text-xs text-gray-500">{hint}</span>}
    </label>
  )
}

const inputBase = 'block min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20 disabled:bg-gray-50'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} py-3 ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

type Variant = 'primary' | 'navy' | 'outline' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-brand-amber text-brand-navy hover:bg-amber-400',
  navy: 'bg-brand-navy text-white hover:bg-brand-navy/90',
  outline: 'border-2 border-brand-navy text-brand-navy hover:bg-gray-50',
  ghost: 'text-brand-navy hover:bg-gray-100',
  danger: 'border border-red-200 text-red-700 hover:bg-red-50',
}

export function Button({ variant = 'primary', full, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean }) {
  return (
    <button
      {...rest}
      className={`inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
    />
  )
}

export function LinkButton({ href, variant = 'primary', full, children, className = '' }: { href: string; variant?: Variant; full?: boolean; children: ReactNode; className?: string }) {
  return (
    <a href={href} className={`inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 text-base font-semibold transition-colors ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}>
      {children}
    </a>
  )
}

type Tone = 'grey' | 'green' | 'amber' | 'red' | 'blue' | 'navy'
const tones: Record<Tone, string> = {
  grey: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-50 text-blue-800',
  navy: 'bg-brand-navy text-white',
}

export function Pill({ children, tone = 'grey' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export function Notice({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'green' | 'red' | 'blue' }) {
  const t = { amber: 'border-amber-200 bg-amber-50 text-amber-900', green: 'border-green-200 bg-green-50 text-green-900', red: 'border-red-200 bg-red-50 text-red-800', blue: 'border-blue-200 bg-blue-50 text-blue-900' }[tone]
  return <div className={`rounded-xl border p-3.5 text-sm ${t}`}>{children}</div>
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p role="alert" className="text-sm text-red-600">{children}</p>
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  )
}
