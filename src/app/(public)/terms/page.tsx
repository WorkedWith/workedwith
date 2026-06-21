import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — WorkedWith' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-navy px-4 pb-12 pt-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <a href="/" className="text-xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
          <h1 className="mt-8 text-3xl font-bold text-white sm:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-white/50">Last updated: June 2026</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="prose prose-gray max-w-none space-y-10">

          <Section n={1} title="What WorkedWith is">
            <p>WorkedWith is a trust and accountability platform for the UK trades industry. It allows tradespeople and clients to leave verified mutual reviews of each other following confirmed jobs. WorkedWith does not manage jobs, handle payments between parties, or facilitate bookings. The platform is a reputation layer that sits on top of existing working relationships.</p>
          </Section>

          <Section n={2} title="Accounts">
            <p>You must be at least 18 years old to create an account. You are responsible for keeping your login credentials secure. You must provide accurate information when registering, including your real name and a valid UK mobile number. One account per person. Creating multiple accounts to circumvent a ban or hide a poor review history is a breach of these terms and may result in permanent removal from the platform.</p>
          </Section>

          <Section n={3} title="Verified identity">
            <p>Phone verification is required to submit or receive reviews. You may optionally verify your identity further by uploading a government-issued driving licence. Completing ID verification unlocks a Verified badge on your public profile, giving clients additional confidence in your identity. Business clients may be verified via Companies House. We retain identity hashes after account deletion to prevent rebrand attempts.</p>
          </Section>

          <Section n={4} title="Reviews">
            <p>Reviews may only be submitted where a job has been logged and confirmed by both parties. Reviews are submitted privately and are not visible to either party until both have submitted. If only one party submits within the review window, their review publishes automatically after 7 days. Reviews must be your honest, factual assessment of the other party. You must not submit false, misleading, defamatory, or discriminatory reviews. We reserve the right to remove reviews that breach these terms following an investigation.</p>
          </Section>

          <Section n={5} title="Disputes">
            <p>Either party may dispute a review within 14 days of it being published. Disputes are reviewed by WorkedWith admin. The review remains visible during the dispute process but is labelled as under dispute. Our decision on disputes is final. We may keep, remove, or amend the written portion of a review.</p>
          </Section>

          <Section n={6} title="Subscriptions">
            <p>Tradesperson accounts may subscribe to Standard (£9.99/month or £109.89/year) or Pro (£39.99/month or £439.89/year) tiers. Client accounts are always free. Subscriptions are billed via Stripe. You may cancel at any time. Your subscription remains active until the end of the current billing period, then reverts to Free. No data is lost on downgrade. Annual subscribers retain their agreed price for the duration of their term. No partial refunds are issued for annual plans cancelled mid-term. We reserve the right to change prices with reasonable notice to monthly subscribers.</p>
          </Section>

          <Section n={7} title="Prohibited conduct">
            <p>You must not use WorkedWith to harass, threaten, or abuse other users; submit fake reviews or pay for reviews; attempt to circumvent the blind review system; create fake jobs to generate reviews; use the platform to contact users for unsolicited commercial purposes; or scrape or extract user data.</p>
          </Section>

          <Section n={8} title="Fake review detection">
            <p>We operate automated systems to detect coordinated fake reviews, including IP and device fingerprinting, velocity checks, and postcode distance anomaly detection. Accounts found to be involved in fake review activity will be permanently banned and their identity hashes retained to prevent re-registration.</p>
          </Section>

          <Section n={9} title="Intellectual property">
            <p>WorkedWith and its content are owned by WorkedWith. You retain ownership of the reviews you write. By submitting a review you grant WorkedWith a licence to display it on the platform.</p>
          </Section>

          <Section n={10} title="Limitation of liability">
            <p>WorkedWith is provided as-is. We do not guarantee the accuracy of reviews or the conduct of any user. We are not liable for any loss or damage arising from your use of the platform or from any job arranged through connections made on the platform.</p>
          </Section>

          <Section n={11} title="Governing law">
            <p>These terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </Section>

          <Section n={12} title="Changes to these terms">
            <p>We may update these terms from time to time. We will notify registered users of material changes. Continued use of the platform after changes take effect constitutes acceptance.</p>
          </Section>

          <Section n={13} title="Contact">
            <p>For questions about these terms contact <a href="mailto:hello@workedwith.co.uk" className="text-brand-amber hover:underline">hello@workedwith.co.uk</a>.</p>
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
