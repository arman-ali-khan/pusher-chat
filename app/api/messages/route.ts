import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { MessageCrypto } from '@/lib/crypto';
import { sanitizeMessage } from '@/lib/sanitizer';
import { rateLimit } from '@/lib/rate-limiter';
import { pusherServer } from '@/lib/pusher';
import { supabase } from '@/lib/supabase';

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

    // Rate limiting
    const limitResult = rateLimit(`messages:${auth.username}`, 30, 60000); // 30 messages per minute
    if (!limitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { channelId, content, messageType = 'text', replyTo, signature } = await request.json();

    if (!channelId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user has access to channel
    const { data: membership, error: membershipError } = await supabase
      .from('channel_members')
      .select('*, channel:channels(*)')
      .eq('channel_id', channelId)
      .eq('user_id', auth.userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Channel not found or access denied' }, { status: 404 });
    }

    const channel = membership.channel;

    // Sanitize content
    const sanitizedContent = sanitizeMessage(content);

    // Encrypt message if channel has encryption enabled
    let encryptedContent;
    if (channel.settings.encryption) {
      encryptedContent = MessageCrypto.encrypt(sanitizedContent, auth.username, channelId);
    }

    // Create message
    const messageData = {
      channel_id: channelId,
      sender_id: auth.userId,
      sender_username: auth.username,
      content: sanitizedContent,
      encrypted_content: encryptedContent,
      signature: signature || 'simple-auth',
      message_type: messageType,
      reply_to: replyTo || null,
      mentions: [],
      reactions: [],
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      delivered_to: [],
      read_by: [],
    };

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }
    
    // Update channel last message time
    const { error: updateError } = await supabase
      .from('channels')
      .update({ 
        last_message_at: new Date().toISOString(),
        message_count: channel.message_count + 1
      })
      .eq('id', channelId);

    if (updateError) {
      console.error('Failed to update channel:', updateError);
    }

    // Get sender info
    const { data: sender } = await supabase
      .from('users')
      .select('username, avatar')
      .eq('id', auth.userId)
      .single();

    // Broadcast message to channel
    const messageData_broadcast = {
      ...message,
      sender: {
        username: sender?.username,
        avatar: sender?.avatar,
      },
    };

    await pusherServer.trigger(`channel-${channelId}`, 'new-message', messageData_broadcast);

    return NextResponse.json({ message: messageData_broadcast });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

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

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    // Check access to channel
    const { data: membership, error: membershipError } = await supabase
      .from('channel_members')
      .select('*, channel:channels(*)')
      .eq('channel_id', channelId)
      .eq('user_id', auth.userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Channel not found or access denied' }, { status: 404 });
    }

    const channel = membership.channel;

    // Get messages with pagination
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(username, avatar)
      `)
      .eq('channel_id', channelId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (messagesError) {
      throw messagesError;
    }

    // Decrypt messages if needed
    const decryptedMessages = (messages || []).map(msg => {
      if (msg.encrypted_content && channel.settings.encryption) {
        try {
          const decryptedContent = MessageCrypto.decrypt(msg.encrypted_content, auth.username, channelId);
          return { ...msg, content: decryptedContent };
        } catch (error) {
          // If decryption fails, keep original content
          return msg;
        }
      }
      return msg;
    });

    return NextResponse.json({ 
      messages: decryptedMessages.reverse(),
      hasMore: messages?.length === limit,
      page,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}