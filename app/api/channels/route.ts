import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

    const client = await clientPromise;
    const db = client.db('web3chat');

    // Get user's channels
    const channels = await db.collection('channels')
      .aggregate([
        {
          $match: {
            participants: new ObjectId(auth.userId),
            isArchived: false,
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'participants',
            foreignField: '_id',
            as: 'participantUsers',
          }
        },
        {
          $lookup: {
            from: 'messages',
            let: { channelId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$channelId', '$$channelId'] },
                  isDeleted: false,
                }
              },
              {
                $sort: { createdAt: -1 }
              },
              {
                $limit: 1
              }
            ],
            as: 'lastMessage',
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            description: 1,
            messageCount: 1,
            lastMessageAt: 1,
            settings: 1,
            participants: {
              $map: {
                input: '$participantUsers',
                as: 'user',
                in: {
                  id: '$$user._id',
                  username: '$$user.username',
                  avatar: '$$user.avatar',
                  isOnline: '$$user.isOnline',
                }
              }
            },
            lastMessage: {
              $arrayElemAt: ['$lastMessage', 0]
            }
          }
        },
        {
          $sort: { lastMessageAt: -1 }
        }
      ])
      .toArray();

    return NextResponse.json({ channels });
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

    const { name, description, type = 'public', participantUsernames = [] } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Channel name required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('web3chat');

    // Get participant user IDs
    const participants = [new ObjectId(auth.userId)];
    
    if (participantUsernames.length > 0) {
      const users = await db.collection('users').find({
        username: { $in: participantUsernames }
      }).toArray();
      
      participants.push(...users.map(user => user._id));
    }

    // Create channel
    const channel = {
      name,
      description,
      type,
      participants,
      admins: [new ObjectId(auth.userId)],
      createdBy: new ObjectId(auth.userId),
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      settings: {
        encryption: true,
        readReceipts: true,
        typingIndicators: true,
      },
      messageCount: 0,
    };

    const result = await db.collection('channels').insertOne(channel);

    return NextResponse.json({ 
      channel: { ...channel, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
  }
}