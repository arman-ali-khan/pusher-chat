/*
  # Fix Column Schema Issues

  1. Issues Fixed
    - Ensure message_timestamp column exists and is properly named
    - Fix any remaining encrypted_content vs content column issues
    - Ensure all expected columns exist with correct names

  2. Schema Verification and Fixes
    - Check and fix column names in messages table
    - Ensure proper data types and constraints
    - Update any remaining references

  3. Data Integrity
    - Preserve existing data during column operations
    - Ensure no data loss during schema fixes
*/

-- First, let's check what columns actually exist and fix them
DO $$
BEGIN
  -- Handle the timestamp column issue
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'timestamp'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'message_timestamp'
  ) THEN
    -- Rename timestamp to message_timestamp
    ALTER TABLE messages RENAME COLUMN timestamp TO message_timestamp;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'message_timestamp'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'timestamp'
  ) THEN
    -- Add message_timestamp column if neither exists
    ALTER TABLE messages ADD COLUMN message_timestamp timestamptz DEFAULT now();
  END IF;

  -- Handle the content column issue
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'encrypted_content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'content'
  ) THEN
    -- Rename encrypted_content to content
    ALTER TABLE messages RENAME COLUMN encrypted_content TO content;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'encrypted_content'
  ) THEN
    -- Add content column if neither exists
    ALTER TABLE messages ADD COLUMN content text NOT NULL DEFAULT '';
  END IF;

  -- Ensure other required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'status'
  ) THEN
    ALTER TABLE messages ADD COLUMN status text DEFAULT 'sent';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_edited'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_edited boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN edited_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'edit_history'
  ) THEN
    ALTER TABLE messages ADD COLUMN edit_history jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'chunk_info'
  ) THEN
    ALTER TABLE messages ADD COLUMN chunk_info jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'original_receiver'
  ) THEN
    ALTER TABLE messages ADD COLUMN original_receiver text;
  END IF;

  -- Fix typing_status table timestamp column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'typing_status' AND column_name = 'timestamp'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'typing_status' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE typing_status RENAME COLUMN timestamp TO updated_at;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'typing_status' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE typing_status ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

END $$;

-- Ensure all tables exist with proper structure
CREATE TABLE IF NOT EXISTS users (
  username text PRIMARY KEY,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_username text NOT NULL,
  receiver_username text NOT NULL,
  content text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'text',
  message_timestamp timestamptz DEFAULT now(),
  status text DEFAULT 'sent',
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  edit_history jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  chunk_info jsonb,
  original_receiver text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  conversation_with text NOT NULL,
  is_typing boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(username, conversation_with)
);

CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  reader_username text NOT NULL,
  read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, reader_username)
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Recreate policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
DROP POLICY IF EXISTS "Allow all operations on typing_status" ON typing_status;
DROP POLICY IF EXISTS "message_reads_full_access" ON message_reads;

CREATE POLICY "Allow all operations on users" ON users
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on typing_status" ON typing_status
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "message_reads_full_access" ON message_reads
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Recreate essential indexes
DROP INDEX IF EXISTS idx_messages_sender_receiver;
DROP INDEX IF EXISTS idx_messages_timestamp;
DROP INDEX IF EXISTS idx_messages_conversation_optimized;
DROP INDEX IF EXISTS idx_messages_recent_general;
DROP INDEX IF EXISTS idx_messages_unread_optimized;
DROP INDEX IF EXISTS idx_messages_status_optimized;
DROP INDEX IF EXISTS idx_messages_chunked_optimized;

CREATE INDEX idx_messages_sender_receiver 
  ON messages(sender_username, receiver_username, message_timestamp DESC);

CREATE INDEX idx_messages_timestamp 
  ON messages(message_timestamp DESC);

CREATE INDEX idx_messages_conversation_optimized 
  ON messages(sender_username, receiver_username, message_timestamp DESC)
  WHERE content_type = 'text';

CREATE INDEX idx_messages_recent_general 
  ON messages(message_timestamp DESC, sender_username, receiver_username);

CREATE INDEX idx_messages_unread_optimized 
  ON messages(receiver_username, status, message_timestamp DESC)
  WHERE status IS DISTINCT FROM 'read';

CREATE INDEX idx_messages_status_optimized 
  ON messages(status, message_timestamp DESC)
  WHERE status IS NOT NULL;

CREATE INDEX idx_messages_chunked_optimized 
  ON messages(chunk_info, message_timestamp DESC)
  WHERE chunk_info IS NOT NULL;

-- Indexes for other tables
CREATE INDEX IF NOT EXISTS idx_users_last_seen_general 
  ON users(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_typing_status_conversation 
  ON typing_status(conversation_with, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_typing_status_timestamp 
  ON typing_status(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_reads_message_id 
  ON message_reads(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reads_reader 
  ON message_reads(reader_username, read_at DESC);

-- Recreate functions with correct column names
CREATE OR REPLACE FUNCTION get_conversation_messages(
  user1 text,
  user2 text,
  message_limit integer DEFAULT 100,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  sender_username text,
  receiver_username text,
  content text,
  content_type text,
  message_timestamp timestamptz,
  status text,
  is_edited boolean,
  edited_at timestamptz,
  chunk_info jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_username,
    m.receiver_username,
    m.content,
    m.content_type,
    m.message_timestamp,
    m.status,
    m.is_edited,
    m.edited_at,
    m.chunk_info
  FROM messages m
  WHERE 
    (m.sender_username = user1 AND m.receiver_username = user2) OR
    (m.sender_username = user2 AND m.receiver_username = user1)
  ORDER BY m.message_timestamp DESC
  LIMIT message_limit
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Ensure triggers exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_typing_status_updated_at ON typing_status;

CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_typing_status_updated_at 
  BEFORE UPDATE ON typing_status 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();