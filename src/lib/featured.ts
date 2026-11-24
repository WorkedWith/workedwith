const OUTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}\b/i

/** At most the postcode district, never the full address (PRD 15). */
export function districtFrom(address: string | null | undefined): string | null {
  const m = address ? OUTCODE.exec(address) : null
  return m ? m[1].toUpperCase() : null
}

/** "Bathroom fitting, March 2027, WA14". Job type and month only, never the client's name. */
export function featuredTitle(jobType: string, paidAt: string | null, address: string | null): string {
  const month = paidAt ? new Date(paidAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null
  return [jobType, month, districtFrom(address)].filter(Boolean).join(', ')
}
