import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limiter';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { username, phoneNumber } = await request.json();
    
    // Rate limiting - more restrictive for login attempts
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limitResult = rateLimit(`auth:${ip}:${username}`, 5, 300000); // 5 attempts per 5 minutes per IP/username combo
    if (!limitResult.success) {
      return NextResponse.json({ 
        error: 'Too many login attempts. Please wait 5 minutes before trying again.' 
      }, { status: 429 });
    }

    // Validate username
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    
    if (!AuthService.validateUsername(trimmedUsername)) {
      if (trimmedUsername.length === 0) {
        return NextResponse.json({ 
          error: 'Username cannot be empty' 
        }, { status: 400 });
      } else if (trimmedUsername.length < 3) {
        return NextResponse.json({ 
          error: 'Username must be at least 3 characters long' 
        }, { status: 400 });
      } else if (trimmedUsername.length > 20) {
        return NextResponse.json({ 
          error: 'Username must be no more than 20 characters long' 
        }, { status: 400 });
      } else {
        return NextResponse.json({ 
          error: 'Username can only contain letters, numbers, and underscores' 
        }, { status: 400 });
      }
    }

    // Validate phone number if provided
    if (phoneNumber && !AuthService.validatePhoneNumber(phoneNumber)) {
      return NextResponse.json({ 
        error: 'Please enter a valid phone number format' 
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedUsername = AuthService.sanitizeUsername(trimmedUsername);
    const sanitizedPhone = AuthService.sanitizePhoneNumber(phoneNumber);

    // Check if username already exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('username', sanitizedUsername)
      .single();

    let user;

    if (findError && findError.code === 'PGRST116') {
      // User doesn't exist, create new user
      const newUser = {
        username: sanitizedUsername,
        phone_number: sanitizedPhone,
        is_online: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reputation: 0,
        blocked_users: [],
        settings: {
          notifications: true,
          dark_mode: false,
          encryption: true,
        },
      };
      
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('Create user error:', createError);
        
        if (createError.code === '23505') { // Unique constraint violation
          return NextResponse.json({ 
            error: 'This username is already taken. Please choose a different username.' 
          }, { status: 409 });
        }
        
        return NextResponse.json({ 
          error: 'Failed to create user account. Please try again.' 
        }, { status: 500 });
      }

      user = createdUser;
    } else if (findError) {
      console.error('Find user error:', findError);
      return NextResponse.json({ 
        error: 'Database error occurred. Please try again.' 
      }, { status: 500 });
    } else {
      // User exists, update their status and phone number if provided
      const updateData: any = { 
        is_online: true,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Only update phone number if a new one is provided and it's different
      if (sanitizedPhone && sanitizedPhone !== existingUser.phone_number) {
        updateData.phone_number = sanitizedPhone;
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update user error:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update user information. Please try again.' 
        }, { status: 500 });
      }

      user = updatedUser;
    }

    // Generate JWT token
    const token = AuthService.generateToken(user.username, user.id);

    // Create session record
    const sessionData = {
      user_id: user.id,
      username: user.username,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      created_at: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    };

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert(sessionData);

    if (sessionError) {
      console.error('Create session error:', sessionError);
      // Don't fail the login if session creation fails, just log it
    }

    // Return success response
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        phoneNumber: user.phone_number,
        avatar: user.avatar,
        settings: user.settings,
      },
      token,
    });

  } catch (error) {
    console.error('Auth login error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again.' 
    }, { status: 500 });
  }
}