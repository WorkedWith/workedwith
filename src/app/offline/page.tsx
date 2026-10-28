export const metadata = { title: 'Offline | WorkedWith', robots: { index: false } }

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-6 text-center">
      <h1 className="text-2xl font-bold text-white">You are offline</h1>
      <p className="mt-2 max-w-sm text-sm text-white/70">
        WorkedWith needs a connection to show your jobs and reviews. Check your signal and try again.
      </p>
      <a href="/dashboard" className="mt-6 rounded-lg bg-brand-amber px-5 py-3 text-sm font-semibold text-brand-navy">Try again</a>
    </main>
  )
}
