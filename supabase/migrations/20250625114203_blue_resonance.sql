/*
  # Fix timestamp syntax error

  1. Issues Fixed
    - Replace 'timestamp' column name with 'message_timestamp' to avoid reserved keyword conflict
    - Update all references to use the new column name
    - Ensure proper column types and constraints

  2. Schema Updates
    - Rename timestamp column to message_timestamp in messages table
    - Update indexes to use new column name
    - Update functions to use new column name

  3. Data Migration
    - Preserve existing data during column rename
    - Update all dependent objects
*/

-- First, check if the column exists and rename it if needed
DO $$
BEGIN
  -- Check if timestamp column exists and rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE messages RENAME COLUMN timestamp TO message_timestamp;
  END IF;
  
  -- Ensure the column exists with correct type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'message_timestamp'
  ) THEN
    ALTER TABLE messages ADD COLUMN message_timestamp timestamptz DEFAULT now();
  END IF;
END $$;

-- Update the content column name if it's still encrypted_content
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'encrypted_content'
  ) THEN
    ALTER TABLE messages RENAME COLUMN encrypted_content TO content;
  END IF;
  
  -- Ensure content column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE messages ADD COLUMN content text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Drop old indexes that might reference the old column name
DROP INDEX IF EXISTS idx_messages_sender_receiver;
DROP INDEX IF EXISTS idx_messages_timestamp;
DROP INDEX IF EXISTS idx_messages_conversation_optimized;
DROP INDEX IF EXISTS idx_messages_recent;

-- Recreate indexes with correct column names
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver 
  ON messages(sender_username, receiver_username, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
  ON messages(message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_optimized 
  ON messages(sender_username, receiver_username, message_timestamp DESC)
  WHERE content_type = 'text';

CREATE INDEX IF NOT EXISTS idx_messages_recent 
  ON messages(message_timestamp DESC, sender_username, receiver_username)
  WHERE message_timestamp > (now() - interval '30 days');

CREATE INDEX IF NOT EXISTS idx_messages_unread 
  ON messages(receiver_username, status, message_timestamp DESC)
  WHERE status != 'read';

-- Update the get_recent_messages function to use correct column names
CREATE OR REPLACE FUNCTION get_recent_messages(
  user1 text,
  user2 text,
  message_limit integer DEFAULT 100
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
  LIMIT message_limit;
END;
$$ LANGUAGE plpgsql;

-- Update typing_status table timestamp column if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'typing_status' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE typing_status RENAME COLUMN timestamp TO updated_at;
  END IF;
END $$;

-- Update typing_status indexes
DROP INDEX IF EXISTS idx_typing_status_conversation;
DROP INDEX IF EXISTS idx_typing_status_timestamp;

CREATE INDEX IF NOT EXISTS idx_typing_status_conversation 
  ON typing_status(conversation_with, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_typing_status_timestamp 
  ON typing_status(updated_at DESC);

-- Update cleanup function for typing status
CREATE OR REPLACE FUNCTION cleanup_old_typing_status()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_status 
  WHERE updated_at < (now() - interval '1 minute');
END;
$$ LANGUAGE plpgsql;