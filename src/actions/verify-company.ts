'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Companies House API types ────────────────────────────────

type CHAddress = {
  postal_code?: string
  address_line_1?: string
  address_line_2?: string
  locality?: string
  country?: string
}

type CHCompanyInfo = {
  company_name: string
  company_number: string
  company_status: string
  registered_office_address: CHAddress
  type: string
}

type CHOfficer = {
  name: string
  officer_role: string
  resigned_on?: string
}

type CHOfficersResponse = {
  items: CHOfficer[]
  total_results: number
}

type CHPSC = {
  name: string
  kind: string
  ceased_on?: string
}

type CHPSCResponse = {
  items: CHPSC[]
  total_results: number
}

// ── Public result types ──────────────────────────────────────

export type CompanyLookupResult =
  | {
      found: true
      company_name: string
      company_status: string
      company_number: string
    }
  | { found: false; reason: string }

export type VerifyCompanyResult =
  | { success: true }
  | {
      success: false
      error: string
      code: 'company_not_found' | 'company_not_active' | 'name_not_matched' | 'already_registered' | 'api_error'
    }

// ── Helpers ──────────────────────────────────────────────────

function normalizeChNumber(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/\s/g, '')
  // Pad pure-numeric inputs to 8 digits (e.g. "12345" → "00012345")
  if (/^\d+$/.test(cleaned) && cleaned.length < 8) {
    return cleaned.padStart(8, '0')
  }
  return cleaned
}

function chFetch(path: string): Promise<Response> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY ?? ''
  const auth = Buffer.from(`${apiKey}:`).toString('base64')
  return fetch(`https://api.company-information.service.gov.uk${path}`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  })
}

// Names from the officers endpoint arrive as "SURNAME, FIRSTNAME MIDDLE".
// PSC names arrive as "Firstname Surname". This normaliser strips commas,
// collapses whitespace, and lowercases so both formats compare uniformly.
function nameMatches(userFullName: string, chName: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[,.']/g, ' ').replace(/\s+/g, ' ').trim()

  const userParts = norm(userFullName).split(' ').filter((p) => p.length > 1)
  const chNorm = norm(chName)

  return userParts.length > 0 && userParts.every((part) => chNorm.includes(part))
}

// ── Exported actions ─────────────────────────────────────────

/**
 * Lightweight lookup used for the real-time (debounced) field check.
 * Only calls the company info endpoint — no DB writes, no auth required.
 */
export async function lookupCompany(chNumber: string): Promise<CompanyLookupResult> {
  const normalized = normalizeChNumber(chNumber)
  if (!/^[A-Z0-9]{8}$/i.test(normalized)) {
    return { found: false, reason: 'Please enter a valid Companies House number.' }
  }

  try {
    const res = await chFetch(`/company/${normalized}`)

    if (res.status === 404) return { found: false, reason: 'Company not found.' }
    if (!res.ok) return { found: false, reason: 'Companies House API unavailable. Try again shortly.' }

    const data = (await res.json()) as CHCompanyInfo
    return {
      found: true,
      company_name: data.company_name,
      company_status: data.company_status,
      company_number: data.company_number,
    }
  } catch {
    return { found: false, reason: 'Could not reach Companies House. Please try again.' }
  }
}

/**
 * Full verification flow:
 * 1. Fetch company info — must be active
 * 2. Fetch officers + PSC — userFullName must match an active director/PSC
 * 3. Create organisation + member rows, update user record
 */
export async function verifyCompany(
  chNumber: string,
  userFullName: string,
): Promise<VerifyCompanyResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.', code: 'api_error' }
  }

  const admin = createAdminClient()
  const { data: userData } = await admin.from('users').select('*').eq('id', user.id).single()

  if (!userData || userData.verification_tier === 'unverified') {
    return {
      success: false,
      error: 'Phone verification is required before registering a business.',
      code: 'api_error',
    }
  }

  const normalized = normalizeChNumber(chNumber)
  if (!/^[A-Z0-9]{8}$/i.test(normalized)) {
    return { success: false, error: 'Please enter a valid Companies House number.', code: 'api_error' }
  }

  // ── 1. Company info ──────────────────────────────────────
  let companyInfo: CHCompanyInfo
  try {
    const res = await chFetch(`/company/${normalized}`)
    if (res.status === 404) {
      return {
        success: false,
        error: 'Company not found at Companies House. Please check the number and try again.',
        code: 'company_not_found',
      }
    }
    if (!res.ok) {
      return {
        success: false,
        error: 'Could not reach Companies House. Please try again in a moment.',
        code: 'api_error',
      }
    }
    companyInfo = (await res.json()) as CHCompanyInfo
  } catch {
    return {
      success: false,
      error: 'Could not reach Companies House. Please try again in a moment.',
      code: 'api_error',
    }
  }

  if (companyInfo.company_status !== 'active') {
    return {
      success: false,
      error: `This company is not active at Companies House (status: ${companyInfo.company_status}). Only active companies can register.`,
      code: 'company_not_active',
    }
  }

  // ── 2. Officer + PSC name check ──────────────────────────
  let matchFound = false

  try {
    const [officersRes, pscRes] = await Promise.all([
      chFetch(`/company/${normalized}/officers`),
      chFetch(`/company/${normalized}/persons-with-significant-control`),
    ])

    if (officersRes.ok) {
      const officers = (await officersRes.json()) as CHOfficersResponse
      const activeDirectors = officers.items.filter(
        (o) => !o.resigned_on && ['director', 'corporate-director'].includes(o.officer_role),
      )
      if (activeDirectors.some((o) => nameMatches(userFullName, o.name))) {
        matchFound = true
      }
    }

    if (!matchFound && pscRes.ok) {
      const psc = (await pscRes.json()) as CHPSCResponse
      const activePSC = psc.items.filter(
        (p) => !p.ceased_on && p.kind.startsWith('individual'),
      )
      if (activePSC.some((p) => nameMatches(userFullName, p.name))) {
        matchFound = true
      }
    }
  } catch {
    return {
      success: false,
      error: 'Could not verify directorship at Companies House. Please try again.',
      code: 'api_error',
    }
  }

  if (!matchFound) {
    return {
      success: false,
      error: `"${userFullName}" does not match any active director or person with significant control for this company. Please ensure your WorkedWith name exactly matches your name at Companies House.`,
      code: 'name_not_matched',
    }
  }

  // ── 3. Guard against duplicate registration ──────────────
  const { data: existingOrg } = await admin
    .from('organisations')
    .select('*')
    .eq('companies_house_number', normalized)
    .maybeSingle()

  if (existingOrg) {
    return {
      success: false,
      error: 'This company is already registered on WorkedWith. Contact support if you are authorised to join.',
      code: 'already_registered',
    }
  }

  // ── 4. Create organisation row ───────────────────────────
  const { data: newOrg, error: orgError } = await admin
    .from('organisations')
    .insert({
      company_name: companyInfo.company_name,
      companies_house_number: normalized,
      companies_house_verified: true,
      companies_house_verified_at: new Date().toISOString(),
      company_status: companyInfo.company_status,
      registered_postcode: companyInfo.registered_office_address.postal_code ?? null,
      account_type: 'client',
      primary_contact_user_id: user.id,
    })
    .select('*')
    .single()

  if (orgError || !newOrg) {
    return { success: false, error: 'Failed to create your organisation. Please try again.', code: 'api_error' }
  }

  // ── 5. Create owner member row ───────────────────────────
  await admin.from('organisation_members').insert({
    organisation_id: newOrg.id,
    user_id: user.id,
    role: 'owner',
    invited_by: null,
  })

  // ── 6. Update user record ────────────────────────────────
  await admin
    .from('users')
    .update({
      user_type: 'client',
      client_type: 'business',
      organisation_id: newOrg.id,
    })
    .eq('id', user.id)

  return { success: true }
}
