// Single source of truth for the site address.
// Set NEXT_PUBLIC_APP_URL in Vercel (production and preview) and .env.local.
// Every link in emails, SMS, sitemap, canonicals and redirects reads from here,
// so changing the main address (www or not) is a one line environment change.

const DEFAULT_APP_URL = 'https://workedwith.co.uk'

export const APP_URL: string = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')

/** Address without the protocol, for display text such as "workedwith.co.uk/t/your-name" */
export const APP_HOST: string = APP_URL.replace(/^https?:\/\//, '')
