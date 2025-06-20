import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: NextRequest) {
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

    const { socket_id, channel_name } = await request.json();

    const presenceData = {
      user_id: auth.userId,
      user_info: {
        username: auth.username,
      },
    };

    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, presenceData);
    
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Pusher authentication failed' }, { status: 500 });
  }
}