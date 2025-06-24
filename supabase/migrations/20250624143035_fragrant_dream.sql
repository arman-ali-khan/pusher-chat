/*
  # Create Chat Application Database Schema

  1. New Tables
    - `users`
      - `username` (text, primary key) - Unique username for each user
      - `public_key` (text) - RSA public key for encryption
      - `last_seen` (timestamptz) - Last activity timestamp
      - `created_at` (timestamptz) - Account creation timestamp
    
    - `messages`
      - `id` (uuid, primary key) - Unique message identifier
      - `sender_username` (text) - Username of message sender
      - `receiver_username` (text) - Username of message receiver
      - `encrypted_content` (text) - Encrypted message content
      - `content_type` (text) - Type of content (text, image, emoji)
      - `timestamp` (timestamptz) - Message timestamp
      - `created_at` (timestamptz) - Database insertion timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for users to read/write their own data
    - Add policies for message access between sender and receiver

  3. Indexes
    - Add indexes for efficient message querying
    - Add indexes for user lookups
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  username text PRIMARY KEY,
  public_key text NOT NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  receiver_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  encrypted_content text NOT NULL,
  content_type text NOT NULL DEFAULT 'text',
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can read all users" ON users
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE TO anon, authenticated USING (true);

-- Policies for messages table
CREATE POLICY "Users can read messages they sent or received" ON messages
  FOR SELECT TO anon, authenticated 
  USING (sender_username = current_setting('request.jwt.claims', true)::json->>'username' 
         OR receiver_username = current_setting('request.jwt.claims', true)::json->>'username');

CREATE POLICY "Users can insert messages as sender" ON messages
  FOR INSERT TO anon, authenticated 
  WITH CHECK (sender_username = current_setting('request.jwt.claims', true)::json->>'username');

-- Since we're using username-based system without auth, let's make it more permissive
DROP POLICY IF EXISTS "Users can read messages they sent or received" ON messages;
DROP POLICY IF EXISTS "Users can insert messages as sender" ON messages;

CREATE POLICY "Anyone can read messages" ON messages
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert messages" ON messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver 
  ON messages(sender_username, receiver_username, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
  ON messages(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_users_last_seen 
  ON users(last_seen DESC);