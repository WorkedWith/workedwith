export function cleanSortCode(input: string): string | null {
  const d = input.replace(/\D/g, '')
  return /^\d{6}$/.test(d) ? d : null
}

export function cleanAccountNumber(input: string): string | null {
  const d = input.replace(/\D/g, '')
  return /^\d{8}$/.test(d) ? d : null
}

/** 123456 to 12 34 56 */
export function formatSortCode(sortCode: string): string {
  return sortCode.replace(/^(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3')
}
