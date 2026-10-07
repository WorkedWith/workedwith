import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/dashboard',
          '/settings',
          '/profile',
          '/jobs',
          '/reviews',
          '/org',
          '/search',
          '/subscription',
          '/verify',
          '/notifications',
          '/invite',
          '/claim',
        ],
      },
    ],
    sitemap: 'https://workedwith.co.uk/sitemap.xml',
  }
}
