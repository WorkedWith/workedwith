import { createAdminClient } from '@/lib/supabase/admin'
import { VerificationQueue } from '@/components/admin/verification-queue'
import type { VerificationDocWithUser } from '@/components/admin/verification-queue'
import type { VerificationDocument, User } from '@/types/database'

export const metadata = { title: 'Verification Queue — WorkedWith Admin' }

export default async function VerificationPage() {
  const admin = createAdminClient()

  const { data: rawDocs } = await admin
    .from('verification_documents')
    .select('*')
    .eq('outcome', 'pending')
    .order('submitted_at', { ascending: true })

  const docs = (rawDocs ?? []) as unknown as VerificationDocument[]

  // Fetch related users
  const userIds = Array.from(new Set(docs.map(d => d.user_id)))
  const { data: rawUsers } = userIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', userIds)
    : { data: [] }
  const users = (rawUsers ?? []) as Pick<User, 'id' | 'full_name' | 'email'>[]

  // Generate signed URLs for each document
  const docsWithData: VerificationDocWithUser[] = await Promise.all(
    docs.map(async doc => {
      const { data: urlData } = await admin.storage
        .from('id-documents')
        .createSignedUrl(doc.storage_path, 3600)
      return {
        ...doc,
        user: users.find(u => u.id === doc.user_id) ?? null,
        signedUrl: urlData?.signedUrl ?? null,
      }
    })
  )

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          {docs.length === 0
            ? 'All caught up.'
            : `${docs.length} document${docs.length === 1 ? '' : 's'} awaiting review, oldest first.`}
        </p>
      </div>
      <VerificationQueue docs={docsWithData} />
    </div>
  )
}
