import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'WorkedWith | Know who you\'re working with',
  description: 'The only platform where both the tradesperson and the client have a reputation to protect. Mutual reviews. ID checks. Real accountability.',
  openGraph: {
    title: 'WorkedWith | Know who you\'re working with',
    description: 'The only platform where both the tradesperson and the client have a reputation to protect. Mutual reviews. ID checks. Real accountability.',
    siteName: 'WorkedWith',
    type: 'website',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0F1F3D',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
