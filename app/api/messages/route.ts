import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { MessageCrypto } from '@/lib/crypto';
import { sanitizeMessage } from '@/lib/sanitizer';
import { rateLimit } from '@/lib/rate-limiter';
import { pusherServer } from '@/lib/pusher';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

    const client = await clientPromise;
    const db = client.db('web3chat');

    // Check if user has access to channel
    const channel = await db.collection('channels').findOne({
      _id: new ObjectId(channelId),
      participants: new ObjectId(auth.userId),
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or access denied' }, { status: 404 });
    }

    // Sanitize content
    const sanitizedContent = sanitizeMessage(content);

    // Encrypt message if channel has encryption enabled
    let encryptedContent;
    if (channel.settings.encryption) {
      encryptedContent = MessageCrypto.encrypt(sanitizedContent, auth.username, channelId);
    }

    // Create message
    const message = {
      channelId: new ObjectId(channelId),
      senderId: new ObjectId(auth.userId),
      senderUsername: auth.username,
      content: sanitizedContent,
      ...(encryptedContent && { encryptedContent }),
      signature: signature || 'simple-auth',
      messageType,
      ...(replyTo && { replyTo: new ObjectId(replyTo) }),
      mentions: [],
      reactions: [],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date(),
      deliveredTo: [],
      readBy: [],
    };

    const result = await db.collection('messages').insertOne(message);
    
    // Update channel last message time
    await db.collection('channels').updateOne(
      { _id: new ObjectId(channelId) },
      { 
        $set: { lastMessageAt: new Date() },
        $inc: { messageCount: 1 }
      }
    );

    // Get sender info
    const sender = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) });

    // Broadcast message to channel
    const messageData = {
      ...message,
      _id: result.insertedId,
      sender: {
        username: sender?.username,
        avatar: sender?.avatar,
      },
    };

    await pusherServer.trigger(`channel-${channelId}`, 'new-message', messageData);

    return NextResponse.json({ message: messageData });
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

    const client = await clientPromise;
    const db = client.db('web3chat');

    // Check access to channel
    const channel = await db.collection('channels').findOne({
      _id: new ObjectId(channelId),
      participants: new ObjectId(auth.userId),
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or access denied' }, { status: 404 });
    }

    // Get messages with pagination
    const messages = await db.collection('messages')
      .aggregate([
        {
          $match: {
            channelId: new ObjectId(channelId),
            isDeleted: false,
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'sender',
          }
        },
        {
          $unwind: '$sender'
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        },
        {
          $project: {
            _id: 1,
            content: 1,
            encryptedContent: 1,
            messageType: 1,
            signature: 1,
            createdAt: 1,
            replyTo: 1,
            reactions: 1,
            isEdited: 1,
            'sender.username': 1,
            'sender.avatar': 1,
          }
        }
      ])
      .toArray();

    // Decrypt messages if needed
    const decryptedMessages = messages.map(msg => {
      if (msg.encryptedContent && channel.settings.encryption) {
        try {
          const decryptedContent = MessageCrypto.decrypt(msg.encryptedContent, auth.username, channelId);
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
      hasMore: messages.length === limit,
      page,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}