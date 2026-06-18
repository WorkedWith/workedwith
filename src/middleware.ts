import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { updateSession } from '@/lib/supabase/middleware'
import { type Database } from '@/types/database'

export async function middleware(request: NextRequest) {
  const sessionResponse = await updateSession(request)

  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Read-only auth check — setAll is a no-op since updateSession already handled cookie refresh
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: userRow } = await admin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userRow?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return sessionResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
