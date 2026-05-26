import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/api/response']
const AUTH_ONLY_PATHS = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://tcklshspgynpkwkhciom.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_DU4uJ0ZMUg1stD9qrdBxsw_5kqaWZW7',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const hasSession = !!user

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && AUTH_ONLY_PATHS.some(p => pathname === p)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
