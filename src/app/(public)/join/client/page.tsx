import { redirect } from 'next/navigation'

type Props = { searchParams: Promise<{ token?: string }> }

/** One client account type; person or company is set on the account (PRD 5). Business sign up is parked. */
export default async function JoinClientPage({ searchParams }: Props) {
  const { token } = await searchParams
  redirect(`/join/client/individual${token ? `?token=${encodeURIComponent(token)}` : ''}`)
}
