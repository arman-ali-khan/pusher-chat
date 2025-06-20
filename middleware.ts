import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limiter';

export function middleware(request: NextRequest) {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1';
    const limitResult = rateLimit(`api:${ip}`, 100, 60000); // 100 requests per minute
    
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': limitResult.remaining.toString(),
            'X-RateLimit-Reset': limitResult.resetTime.toString(),
          }
        }
      );
    }
  }

  // Security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-.*\\.png).*)',
  ],
};