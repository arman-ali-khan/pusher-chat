import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin';
import { rateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for admin authentication
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limitResult = rateLimit(`admin-auth:${ip}`, 5, 300000); // 5 attempts per 5 minutes
    
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const isValid = await AdminService.verifyAdminPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin authentication successful'
    });

  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}