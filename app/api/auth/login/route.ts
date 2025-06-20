import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limiter';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { username, phoneNumber } = await request.json();
    
    // Rate limiting
    const limitResult = rateLimit(`auth:${username}`, 5, 300000); // 5 attempts per 5 minutes
    if (!limitResult.success) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    }

    // Validate input
    if (!AuthService.validateUsername(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters, letters, numbers, and underscores only' 
      }, { status: 400 });
    }

    if (phoneNumber && !AuthService.validatePhoneNumber(phoneNumber)) {
      return NextResponse.json({ 
        error: 'Invalid phone number format' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('web3chat');
    
    // Find or create user
    let user = await db.collection('users').findOne({ username });
    
    if (!user) {
      // Check if username is already taken
      const existingUser = await db.collection('users').findOne({ username });
      if (existingUser) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }

      // Create new user
      const newUser = {
        username,
        phoneNumber: phoneNumber || null,
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        reputation: 0,
        blockedUsers: [],
        settings: {
          notifications: true,
          darkMode: false,
          encryption: true,
        },
      };
      
      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // Update user status and phone number if provided
      const updateData: any = { 
        isOnline: true,
        lastSeen: new Date(),
        updatedAt: new Date()
      };
      
      if (phoneNumber && phoneNumber !== user.phoneNumber) {
        updateData.phoneNumber = phoneNumber;
      }

      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: updateData }
      );
      
      // Update user object with new phone number if provided
      if (phoneNumber) {
        user.phoneNumber = phoneNumber;
      }
    }

    // Generate JWT token
    const token = AuthService.generateToken(username, user._id.toString());

    // Create session
    await db.collection('sessions').insertOne({
      userId: user._id,
      username,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        settings: user.settings,
      },
      token,
    });
  } catch (error) {
    console.error('Auth login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}