/**
 * Companies House lookup for seeded listings (PRD 16). Uses COMPANIES_HOUSE_API_KEY. With
 * COMPANIES_HOUSE_MODE=mock, any 8 character number is an active private limited company.
 */
export type CompanyFacts = { status: string | null; type: string | null; createdOn: string | null; name: string | null }

const LIMITED_TYPES = ['ltd', 'private-limited-guarant-nsc', 'private-limited-guarant-nsc-limited-exemption', 'private-limited-shares-section-30-exemption', 'plc', 'llp']

export function isLimitedCompany(type: string | null | undefined): boolean {
  return !!type && LIMITED_TYPES.includes(type)
}

export function cleanCompanyNumber(raw: string): string | null {
  const n = raw.trim().toUpperCase().replace(/\s/g, '')
  if (/^\d{1,8}$/.test(n)) return n.padStart(8, '0')
  return /^[A-Z]{2}\d{6}$/.test(n) ? n : null
}

export async function fetchCompany(number: string): Promise<CompanyFacts | null> {
  if (process.env.COMPANIES_HOUSE_MODE === 'mock') return { status: 'active', type: 'ltd', createdOn: '2015-06-01', name: null }
  const key = process.env.COMPANIES_HOUSE_API_KEY
  if (!key) return null
  try {
    const res = await fetch(`https://api.company-information.service.gov.uk/company/${encodeURIComponent(number)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
    })
    if (!res.ok) return null
    const j = (await res.json()) as { company_status?: string; type?: string; date_of_creation?: string; company_name?: string }
    return { status: j.company_status ?? null, type: j.type ?? null, createdOn: j.date_of_creation ?? null, name: j.company_name ?? null }
  } catch {
    return null
  }
}
