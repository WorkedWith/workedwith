import { APP_URL } from '@/lib/app-url'
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
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
