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

    // Determine if user is admin
    const isAdmin = AuthService.isAdminUser(auth.username);

    let channels = [];

    if (isAdmin) {
      // Admin can see all channels
      const { data: allChannels, error } = await supabase
        .from('channels')
        .select(`
          *,
          participants:channel_members!inner(
            user:users(id, username, avatar, is_online)
          ),
          last_message:messages(content, created_at)
        `)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        throw error;
      }

      channels = allChannels || [];
    } else {
      // Regular users can only see channels where they are members AND there's at least one admin
      const { data: userChannels, error } = await supabase
        .from('channel_members')
        .select(`
          channel:channels!inner(
            *,
            participants:channel_members!inner(
              user:users(id, username, avatar, is_online)
            ),
            last_message:messages(content, created_at)
          )
        `)
        .eq('user_id', auth.userId)
        .eq('channels.is_archived', false);

      if (error) {
        throw error;
      }

      // Filter channels to only include those with admin participants
      channels = (userChannels || [])
        .map(item => item.channel)
        .filter(channel => 
          channel.participants?.some((participant: any) => 
            AuthService.isAdminUser(participant.user.username)
          )
        );
    }

    return NextResponse.json({ 
      channels,
      isAdmin,
      total: channels.length
    });
  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json({ error: 'Failed to get channels' }, { status: 500 });
  }
}

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

    // Only admin users can create channels
    if (!AuthService.isAdminUser(auth.username)) {
      return NextResponse.json({ 
        error: 'Only admin users can create channels' 
      }, { status: 403 });
    }

    const { name, description, type = 'public', participantUsernames = [] } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Channel name required' }, { status: 400 });
    }

    // Get participant user IDs
    const participants = [auth.userId];
    
    if (participantUsernames.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .in('username', participantUsernames);
      
      if (usersError) {
        throw usersError;
      }
      
      participants.push(...users.map(user => user.id));
    }

    // Create channel
    const channelData = {
      name,
      description,
      type,
      admins: [auth.userId],
      created_by: auth.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false,
      settings: {
        encryption: true,
        read_receipts: true,
        typing_indicators: true,
      },
      message_count: 0,
    };

    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert(channelData)
      .select()
      .single();

    if (channelError) {
      throw channelError;
    }

    // Add channel members
    const memberData = participants.map(userId => ({
      channel_id: channel.id,
      user_id: userId,
      role: userId === auth.userId ? 'admin' : 'member',
      joined_at: new Date().toISOString(),
      notification_settings: {
        muted: false,
        mentions: true,
      },
    }));

    const { error: membersError } = await supabase
      .from('channel_members')
      .insert(memberData);

    if (membersError) {
      throw membersError;
    }

    return NextResponse.json({ 
      channel: { ...channel, participants }
    });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
  }
}