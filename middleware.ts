import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limiter';

export function middleware(request: NextRequest) {
  // Enhanced rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    
    // Different rate limits for different endpoints
    let limitResult;
    
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      // Stricter rate limiting for authentication endpoints
      limitResult = rateLimit(`api-auth:${ip}`, 10, 60000); // 10 requests per minute for auth
    } else {
      // General API rate limiting
      limitResult = rateLimit(`api:${ip}`, 100, 60000); // 100 requests per minute for other APIs
    }
    
    if (!limitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please slow down your requests.',
          retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': request.nextUrl.pathname.startsWith('/api/auth/') ? '10' : '100',
            'X-RateLimit-Remaining': limitResult.remaining.toString(),
            'X-RateLimit-Reset': limitResult.resetTime.toString(),
            'Retry-After': Math.ceil((limitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }
  }

  // Enhanced security headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss:; font-src 'self' data:;"
  );
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-.*\\.png).*)',
  ],
};