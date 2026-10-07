import { renderEmail } from '@/lib/email/layout'
import { EMAIL_SAMPLES, SMS_SAMPLES } from '@/lib/email/samples'
import { SendButton } from './send-button'

export const metadata = { title: 'Email preview — WorkedWith Admin' }

export default function EmailPreviewPage() {
  const groups = Array.from(new Set(EMAIL_SAMPLES.map(s => s.group)))
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Emails and texts</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Every message WorkedWith sends, with sample details. Use “Send to my inbox” to see one in a real mail app.
        Note the ID next to each (for example E9) when you give feedback.
      </p>

      {groups.map(group => (
        <section key={group} className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">{group}</h2>
          <div className="space-y-6">
            {EMAIL_SAMPLES.filter(s => s.group === group).map(s => {
              const r = renderEmail(s.content)
              return (
                <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.id}. {s.label}</p>
                      <p className="text-xs text-gray-500">To: {s.to}</p>
                      <p className="mt-1 text-xs text-gray-700">Subject: <strong>{r.subject}</strong></p>
                    </div>
                    <SendButton id={s.id} />
                  </div>
                  <iframe title={s.id} srcDoc={r.html} className="h-[520px] w-full rounded-lg border border-gray-100" />
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Texts</h2>
        <div className="space-y-3">
          {SMS_SAMPLES.map(s => (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">{s.id}. {s.label}</p>
              <p className="text-xs text-gray-500">To: {s.to} · {s.text.length} characters</p>
              <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-800">{s.text}</p>
            </div>
          ))}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">S6, S7. Verification codes</p>
            <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
              Your WorkedWith verification code is 123456 (set the friendly name to “WorkedWith” in the Twilio Verify service).
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
