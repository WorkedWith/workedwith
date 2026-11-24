/** Suggested invoice prefix from the business name: "Brown Leigh Construction" to "BLC". */
export function suggestInvoicePrefix(name: string | null | undefined): string {
  const words = (name ?? '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  const initials = words.map(w => w[0]).join('').slice(0, 4)
  return initials.length >= 2 ? initials : (words[0] ?? 'INV').slice(0, 3) || 'INV'
}

export function cleanPrefix(input: string): string | null {
  const p = input.trim().toUpperCase().replace(/\s+/g, '')
  return /^[A-Z0-9]{1,6}$/.test(p) ? p : null
}

export const UK_VAT_RE = /^(GB)?\d{9}(\d{3})?$/
