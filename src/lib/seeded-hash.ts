import { createHash } from 'crypto'

export function normaliseBusinessName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function normalisePhone(phone: string): string {
  const s = phone.replace(/[\s\-\(\)\.]/g, '')
  if (s.startsWith('+44')) return s
  if (s.startsWith('0044')) return '+44' + s.slice(4)
  if (s.startsWith('00')) return '+' + s.slice(2)
  if (s.startsWith('0')) return '+44' + s.slice(1)
  return s
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
