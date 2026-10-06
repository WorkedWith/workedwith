'use server'

export type DistrictEntry = {
  code: string
  adminDistrict: string | null
}

export type ResolveDistrictResult =
  | { success: true; entry: DistrictEntry }
  | { success: false; error: string }

const OUTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?$/i
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z0-9]?\s?\d[A-Z]{2}$/i

type PostcodeIoPostcode = {
  outcode: string
  admin_district: string | null
}

type PostcodeIoOutcode = {
  admin_district: string | string[] | null
}

type PostcodeIoPlace = {
  outcode: string | null
  district_borough: string | null
}

export async function resolveDistrict(query: string): Promise<ResolveDistrictResult> {
  const q = query.trim().toUpperCase().replace(/\s+/g, ' ')

  if (!q) {
    return { success: false, error: 'Please enter a postcode, district code, or place name.' }
  }

  // Full postcode → resolve to outward code
  if (UK_POSTCODE_RE.test(q)) {
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(q)}`,
        { cache: 'no-store' },
      )
      if (res.ok) {
        const data = (await res.json()) as { result: PostcodeIoPostcode | null }
        if (data.result?.outcode) {
          return {
            success: true,
            entry: {
              code: data.result.outcode.toUpperCase(),
              adminDistrict: data.result.admin_district ?? null,
            },
          }
        }
      }
      return { success: false, error: 'Postcode not found. Please check and try again.' }
    } catch {
      return { success: false, error: 'Could not reach the postcode lookup service.' }
    }
  }

  const noSpace = q.replace(/\s+/g, '')

  // Outward code → validate directly
  if (OUTCODE_RE.test(noSpace)) {
    try {
      const res = await fetch(
        `https://api.postcodes.io/outcodes/${encodeURIComponent(noSpace)}`,
        { cache: 'no-store' },
      )
      if (res.ok) {
        const data = (await res.json()) as { result: PostcodeIoOutcode | null }
        if (data.result) {
          const ad = data.result.admin_district
          const adminDistrict = Array.isArray(ad) ? (ad[0] ?? null) : (ad ?? null)
          return {
            success: true,
            entry: { code: noSpace.toUpperCase(), adminDistrict },
          }
        }
      }
      return { success: false, error: 'District code not recognised. Try entering a full postcode instead.' }
    } catch {
      return { success: false, error: 'Could not reach the postcode lookup service.' }
    }
  }

  // Place name → search postcodes.io places
  try {
    const res = await fetch(
      `https://api.postcodes.io/places?q=${encodeURIComponent(q)}&limit=1`,
      { cache: 'no-store' },
    )
    if (res.ok) {
      const data = (await res.json()) as { result: PostcodeIoPlace[] | null }
      const place = data.result?.[0]
      if (place?.outcode) {
        return {
          success: true,
          entry: {
            code: place.outcode.toUpperCase(),
            adminDistrict: place.district_borough ?? null,
          },
        }
      }
    }
    return {
      success: false,
      error: 'Place not found. Try a postcode (e.g. M20 1AA) or district code (e.g. M20).',
    }
  } catch {
    return { success: false, error: 'Could not reach the postcode lookup service.' }
  }
}
