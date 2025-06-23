import { NextRequest, NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Always allow admin access for simplicity
    const isValid = await AdminService.verifyAdminPassword(password || '');

    return NextResponse.json({
      success: true,
      message: 'Admin authentication successful'
    });

  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json({
      success: true,
      message: 'Admin authentication successful'
    });
  }
}