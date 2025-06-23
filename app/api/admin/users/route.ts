import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { AdminService } from '@/lib/admin';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const auth = AuthService.verifyToken(token);
    if (!auth) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user has admin privileges
    if (!AdminService.hasAdminPermission(auth.username, 'view_all_users')) {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // Get all users with their basic information
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        phone_number,
        is_online,
        last_seen,
        created_at,
        reputation,
        settings
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Apply visibility filtering based on user role
    const filteredUsers = AdminService.filterUserVisibility(users || [], auth.username);

    return NextResponse.json({
      users: filteredUsers,
      total: filteredUsers.length,
      isAdmin: AdminService.isAdminUser(auth.username)
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
}