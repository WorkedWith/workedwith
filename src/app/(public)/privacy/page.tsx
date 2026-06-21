import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — WorkedWith' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 pb-12 pt-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <a href="/" className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <h1 className="mt-8 text-3xl font-bold text-white sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-white/50">Last updated: June 2026</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="prose prose-gray max-w-none space-y-10">

          <Section n={1} title="What data we collect">
            <p>When you register: your name, email address, and mobile phone number. If you choose to verify your identity: a photo of your driving licence which is deleted after admin review. We retain only a one-way hash of your licence number. ID verification is optional. When you use the platform: job records, reviews you submit, reviews submitted about you, search lookups you perform, and notification activity. When you subscribe: your Stripe customer ID and subscription status. We do not store card details. Device and connection data: IP address and user agent, used for fraud detection.</p>
          </Section>

          <Section n={2} title="Legal basis for processing">
            <p>Contract: to provide the WorkedWith service. Legitimate interest: to detect fraud, prevent fake reviews, and maintain platform integrity. Legal obligation: to comply with applicable law.</p>
          </Section>

          <Section n={3} title="How we use your data">
            <p>To operate your account and provide the platform. To verify your identity. To facilitate job logging and review submission. To send transactional emails. To detect and prevent fake reviews and abuse. To comply with our legal obligations.</p>
          </Section>

          <Section n={4} title="Identity hashes and account closure">
            <p>When an account is closed, we retain a one-way hash of your verified phone number and driving licence number if provided. These hashes are retained indefinitely under legitimate interest to prevent banned users from creating new accounts. Raw numbers and licence images are not retained after closure.</p>
          </Section>

          <Section n={5} title="Reviews and reputation data">
            <p>Reviews submitted about you are retained even if your account is closed, as they form part of another user&apos;s verified history. Your name on those reviews is anonymised to Verified Tradesperson or Verified Client on closure.</p>
          </Section>

          <Section n={6} title="Who we share data with">
            <p>Supabase: database and authentication. Resend: transactional email. Twilio: SMS verification. Stripe: subscription billing. AWS Rekognition: automated image moderation for featured job images. Companies House API: business verification. We do not sell your data. We do not use your data for advertising.</p>
          </Section>

          <Section n={7} title="Data retention">
            <p>Active account data: retained for the duration of your account. Review data: retained indefinitely, anonymised on account closure. Identity hashes: retained indefinitely for fraud prevention. Licence images: deleted after admin review. Search audit logs: retained for 12 months.</p>
          </Section>

          <Section n={8} title="Your rights">
            <p>Under UK GDPR you have the right to access, correct, or delete your personal data, object to processing, and data portability. Contact <a href="mailto:hello@workedwith.co.uk" className="text-brand-amber hover:underline">hello@workedwith.co.uk</a>. We will respond within 30 days.</p>
          </Section>

          <Section n={9} title="Cookies">
            <p>We use only essential session cookies required to operate the platform. We do not use tracking or advertising cookies.</p>
          </Section>

          <Section n={10} title="Security">
            <p>We use encrypted connections, row-level security on all database tables, and access controls. Sensitive identifiers are stored as one-way hashes where possible.</p>
          </Section>

          <Section n={11} title="Contact and complaints">
            <p>Data controller: WorkedWith, <a href="mailto:hello@workedwith.co.uk" className="text-brand-amber hover:underline">hello@workedwith.co.uk</a>. You have the right to complain to the Information Commissioner&apos;s Office at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-brand-amber hover:underline">ico.org.uk</a>.</p>
          </Section>

        </div>
      </div>
    </main>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-brand-navy mb-3">{n}. {title}</h2>
      <div className="text-gray-700 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}
