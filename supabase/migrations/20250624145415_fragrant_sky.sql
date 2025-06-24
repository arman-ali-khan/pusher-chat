/*
  # Fix Chat Application Database Schema

  1. Drop existing tables if they exist (to start fresh)
  2. Create tables in correct order with proper constraints
  3. Set up RLS policies
  4. Create indexes for performance

  This migration fixes the column reference issues in the previous migration.
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table first
CREATE TABLE users (
  username text PRIMARY KEY,
  public_key text NOT NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create messages table with proper foreign key references
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_username text NOT NULL,
  receiver_username text NOT NULL,
  encrypted_content text NOT NULL,
  content_type text NOT NULL DEFAULT 'text',
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Add foreign key constraints after both tables exist
  CONSTRAINT fk_sender FOREIGN KEY (sender_username) REFERENCES users(username) ON DELETE CASCADE,
  CONSTRAINT fk_receiver FOREIGN KEY (receiver_username) REFERENCES users(username) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for users table (allow all operations for simplicity)
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policies for messages table (allow all operations for simplicity)
CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_messages_sender_receiver ON messages(sender_username, receiver_username, timestamp DESC);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_users_last_seen ON users(last_seen DESC);
CREATE INDEX idx_users_username ON users(username);