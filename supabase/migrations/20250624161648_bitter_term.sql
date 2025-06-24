/*
  # Add Typing Status Table

  1. New Table
    - `typing_status`
      - `id` (uuid, primary key) - Unique identifier
      - `username` (text) - User who is typing
      - `conversation_with` (text) - User they are typing to
      - `is_typing` (boolean) - Whether user is currently typing
      - `timestamp` (timestamptz) - When typing status was last updated

  2. Security
    - Enable RLS on typing_status table
    - Add policies for users to manage their own typing status

  3. Indexes
    - Add indexes for efficient querying
*/

-- Create typing_status table
CREATE TABLE IF NOT EXISTS typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  conversation_with text NOT NULL,
  is_typing boolean NOT NULL DEFAULT true,
  timestamp timestamptz DEFAULT now(),
  
  -- Ensure unique constraint for username + conversation_with
  UNIQUE(username, conversation_with)
);

-- Enable Row Level Security
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Policies for typing_status table
CREATE POLICY "Allow all operations on typing_status" ON typing_status
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_typing_status_conversation 
  ON typing_status(conversation_with, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_typing_status_username 
  ON typing_status(username, conversation_with);

CREATE INDEX IF NOT EXISTS idx_typing_status_timestamp 
  ON typing_status(timestamp DESC);

-- Add original_receiver column to messages table for better message tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_receiver text;