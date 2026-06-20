import { SignInForm } from './sign-in-form'

export const metadata = { title: 'Sign in — WorkedWith' }

export default function SignInPage({
  searchParams,
}: {
  searchParams: { message?: string; next?: string }
}) {
  return <SignInForm message={searchParams.message} next={searchParams.next} />
}
