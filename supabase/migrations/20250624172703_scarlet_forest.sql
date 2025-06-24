/*
  # Message Enhancement Features

  1. Add message status and editing capabilities
    - Add status column to messages table
    - Add editing-related columns
    - Create message_reads table for read receipts

  2. New Tables
    - `message_reads` for tracking read status
      - `message_id` (uuid) - Reference to message
      - `reader_username` (text) - User who read the message
      - `read_at` (timestamptz) - When message was read

  3. Schema Updates
    - Add status column to messages table
    - Add is_edited, edited_at, edit_history columns
    - Add updated_at column for tracking changes

  4. Security
    - Enable RLS on message_reads table
    - Add appropriate policies
*/

-- Add new columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create message_reads table for read receipts
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reader_username text NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure unique constraint for message_id + reader_username
  UNIQUE(message_id, reader_username)
);

-- Enable Row Level Security
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Policies for message_reads table
DROP POLICY IF EXISTS "Allow all operations on message_reads" ON message_reads;

CREATE POLICY "Allow all operations on message_reads" ON message_reads
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id 
  ON message_reads(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reads_reader 
  ON message_reads(reader_username, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_status 
  ON messages(status);

CREATE INDEX IF NOT EXISTS idx_messages_edited 
  ON messages(is_edited, edited_at DESC);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();