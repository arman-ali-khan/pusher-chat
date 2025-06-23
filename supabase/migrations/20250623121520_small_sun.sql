/*
  # Initial Schema for Web3 Chat Application

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `phone_number` (text, optional)
      - `ens_name` (text, optional)
      - `avatar` (text, optional)
      - `bio` (text, optional)
      - `is_online` (boolean)
      - `last_seen` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `reputation` (integer)
      - `blocked_users` (text array)
      - `settings` (jsonb)

    - `channels`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text, optional)
      - `type` (text, enum: public/private/direct)
      - `admins` (uuid array)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_message_at` (timestamptz, optional)
      - `is_archived` (boolean)
      - `settings` (jsonb)
      - `message_count` (integer)

    - `channel_members`
      - `id` (uuid, primary key)
      - `channel_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `role` (text, enum: admin/member)
      - `joined_at` (timestamptz)
      - `last_read_message_id` (uuid, optional)
      - `notification_settings` (jsonb)

    - `messages`
      - `id` (uuid, primary key)
      - `channel_id` (uuid, foreign key)
      - `sender_id` (uuid, foreign key)
      - `sender_username` (text)
      - `content` (text)
      - `encrypted_content` (text, optional)
      - `signature` (text)
      - `message_type` (text, enum: text/image/file/emoji)
      - `reply_to` (uuid, optional, foreign key)
      - `mentions` (text array)
      - `reactions` (jsonb)
      - `is_edited` (boolean)
      - `edited_at` (timestamptz, optional)
      - `is_deleted` (boolean)
      - `deleted_at` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `delivered_to` (text array)
      - `read_by` (jsonb)

    - `sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `username` (text)
      - `token` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `ip_address` (text)
      - `user_agent` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for channel access based on membership
    - Add policies for message access based on channel membership

  3. Indexes
    - Add indexes for frequently queried columns
    - Add composite indexes for complex queries
*/

-- Create custom types
CREATE TYPE channel_type AS ENUM ('public', 'private', 'direct');
CREATE TYPE member_role AS ENUM ('admin', 'member');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'emoji');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  phone_number text,
  ens_name text,
  avatar text,
  bio text,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reputation integer DEFAULT 0,
  blocked_users text[] DEFAULT '{}',
  settings jsonb DEFAULT '{"notifications": true, "dark_mode": false, "encryption": true}'::jsonb
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type channel_type DEFAULT 'public',
  admins uuid[] DEFAULT '{}',
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz,
  is_archived boolean DEFAULT false,
  settings jsonb DEFAULT '{"encryption": true, "read_receipts": true, "typing_indicators": true}'::jsonb,
  message_count integer DEFAULT 0
);

-- Channel members table
CREATE TABLE IF NOT EXISTS channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role member_role DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  last_read_message_id uuid,
  notification_settings jsonb DEFAULT '{"muted": false, "mentions": true}'::jsonb,
  UNIQUE(channel_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  sender_username text NOT NULL,
  content text NOT NULL,
  encrypted_content text,
  signature text DEFAULT 'simple-auth',
  message_type message_type DEFAULT 'text',
  reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  mentions text[] DEFAULT '{}',
  reactions jsonb DEFAULT '[]'::jsonb,
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  delivered_to text[] DEFAULT '{}',
  read_by jsonb DEFAULT '[]'::jsonb
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  username text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Anyone can create user"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Channels policies
CREATE POLICY "Users can read channels they are members of"
  ON channels
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT channel_id 
      FROM channel_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create channels"
  ON channels
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by::text = auth.uid()::text);

CREATE POLICY "Channel admins can update channels"
  ON channels
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = ANY(admins::text[]));

-- Channel members policies
CREATE POLICY "Users can read channel members for their channels"
  ON channel_members
  FOR SELECT
  TO authenticated
  USING (
    channel_id IN (
      SELECT channel_id 
      FROM channel_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can join channels"
  ON channel_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can leave channels"
  ON channel_members
  FOR DELETE
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Messages policies
CREATE POLICY "Users can read messages from their channels"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    channel_id IN (
      SELECT channel_id 
      FROM channel_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can send messages to their channels"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id::text = auth.uid()::text AND
    channel_id IN (
      SELECT channel_id 
      FROM channel_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (sender_id::text = auth.uid()::text);

-- Sessions policies
CREATE POLICY "Users can read own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create sessions"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own sessions"
  ON sessions
  FOR DELETE
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_last_message_at ON channels(last_message_at);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Create composite indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_user ON channel_members(channel_id, user_id);