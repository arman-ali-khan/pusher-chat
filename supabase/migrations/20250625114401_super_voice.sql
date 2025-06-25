/*
  # Fix Immutable Function Error in Index Predicates

  1. Issues Fixed
    - Remove `now()` function calls from index WHERE clauses
    - Replace with static date calculations or remove time-based predicates
    - Ensure all functions in index predicates are immutable

  2. Index Updates
    - Recreate indexes without non-immutable function calls
    - Use alternative approaches for performance optimization
    - Maintain query performance without violating PostgreSQL constraints

  3. Performance Considerations
    - Keep essential indexes for query performance
    - Use partial indexes where appropriate with immutable conditions
    - Optimize for common query patterns
*/

-- Drop indexes that use non-immutable functions
DROP INDEX IF EXISTS idx_messages_recent;
DROP INDEX IF EXISTS idx_users_last_seen_optimized;

-- Recreate indexes without non-immutable function calls
-- Instead of filtering by date in the index, we'll create a general index
CREATE INDEX IF NOT EXISTS idx_messages_recent_general 
  ON messages(message_timestamp DESC, sender_username, receiver_username);

-- Create a partial index for active users without time-based predicate
CREATE INDEX IF NOT EXISTS idx_users_last_seen_general 
  ON users(last_seen DESC);

-- Create a more specific index for unread messages without date filtering
CREATE INDEX IF NOT EXISTS idx_messages_unread_optimized 
  ON messages(receiver_username, status, message_timestamp DESC)
  WHERE status IS DISTINCT FROM 'read';

-- Create index for message status tracking
CREATE INDEX IF NOT EXISTS idx_messages_status_optimized 
  ON messages(status, message_timestamp DESC)
  WHERE status IS NOT NULL;

-- Create index for chunked messages
CREATE INDEX IF NOT EXISTS idx_messages_chunked_optimized 
  ON messages(chunk_info, message_timestamp DESC)
  WHERE chunk_info IS NOT NULL;

-- Update the active_users view to handle the immutable function issue
DROP VIEW IF EXISTS active_users;

CREATE OR REPLACE VIEW active_users AS
SELECT 
  username,
  last_seen,
  created_at,
  CASE 
    WHEN last_seen > (CURRENT_TIMESTAMP - interval '5 minutes') THEN true
    ELSE false
  END as is_online
FROM users
ORDER BY 
  CASE 
    WHEN last_seen > (CURRENT_TIMESTAMP - interval '5 minutes') THEN 0
    ELSE 1
  END,
  last_seen DESC;

-- Create a function to get recent messages with better performance
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

-- Create a function to clean up old data (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Clean up old typing status (older than 2 minutes)
  DELETE FROM typing_status 
  WHERE updated_at < (CURRENT_TIMESTAMP - interval '2 minutes');
  
  -- Optionally clean up very old messages (older than 1 year)
  -- Uncomment if you want automatic cleanup
  -- DELETE FROM messages 
  -- WHERE message_timestamp < (CURRENT_TIMESTAMP - interval '1 year');
END;
$$ LANGUAGE plpgsql;

-- Create a function to get unread message count efficiently
CREATE OR REPLACE FUNCTION get_unread_count(
  for_username text,
  from_username text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  unread_count integer;
BEGIN
  IF from_username IS NULL THEN
    SELECT COUNT(*)::integer INTO unread_count
    FROM messages 
    WHERE receiver_username = for_username 
    AND (status IS NULL OR status != 'read');
  ELSE
    SELECT COUNT(*)::integer INTO unread_count
    FROM messages 
    WHERE receiver_username = for_username 
    AND sender_username = from_username
    AND (status IS NULL OR status != 'read');
  END IF;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a function to mark messages as read efficiently
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  reader_username text,
  sender_username text
)
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE messages 
  SET status = 'read', updated_at = CURRENT_TIMESTAMP
  WHERE receiver_username = reader_username 
  AND sender_username = sender_username
  AND (status IS NULL OR status != 'read');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Ensure all tables have proper updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column to typing_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'typing_status' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE typing_status ADD COLUMN updated_at timestamptz DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Ensure triggers exist for updated_at columns
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