import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (publicRoutes.includes(pathname)) return NextResponse.next()

  const token = request.cookies.get('access_token')?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/products/:path*', '/sales/:path*', '/credits/:path*', '/rapports/:path*', '/params/:path*', '/customers/:path*', '/inventory/:path*', '/users/:path*'],
}
