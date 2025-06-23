import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { username, phoneNumber } = await request.json();
    
    // Basic validation
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ 
        error: 'Username is required' 
      }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    
    if (!AuthService.validateUsername(trimmedUsername)) {
      return NextResponse.json({ 
        error: 'Please enter a valid username (2-30 characters)' 
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
          encryption: false, // Disabled for simplicity
        },
      };
      
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('Create user error:', createError);
        
        if (createError.code === '23505') {
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
      // User exists, update their status
      const updateData: any = { 
        is_online: true,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
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

    // Create session record (optional, simplified)
    const sessionData = {
      user_id: user.id,
      username: user.username,
      token,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      created_at: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    };

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert(sessionData);

    if (sessionError) {
      console.error('Create session error:', sessionError);
      // Don't fail the login if session creation fails
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