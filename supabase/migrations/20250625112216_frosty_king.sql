/*
  # Performance Optimization Migration

  1. Schema Updates
    - Remove public_key column from users table (no longer needed)
    - Add chunk_info column to messages table for large message handling
    - Add performance indexes

  2. New Indexes
    - Optimize message queries with better indexing
    - Add indexes for chunked message processing
    - Improve user lookup performance

  3. Performance Improvements
    - Add partial indexes for better query performance
    - Optimize existing indexes
*/

-- Remove public_key column from users table (no longer needed without encryption)
ALTER TABLE users DROP COLUMN IF EXISTS public_key;

-- Add chunk_info column to messages table for handling large messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chunk_info jsonb;

-- Add performance indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_optimized 
  ON messages(sender_username, receiver_username, timestamp DESC)
  WHERE content_type = 'text';

CREATE INDEX IF NOT EXISTS idx_messages_chunked 
  ON messages(chunk_info)
  WHERE chunk_info IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_status_timestamp 
  ON messages(status, timestamp DESC)
  WHERE status IS NOT NULL;

-- Partial index for recent messages (last 30 days)
CREATE INDEX IF NOT EXISTS idx_messages_recent 
  ON messages(timestamp DESC, sender_username, receiver_username)
  WHERE timestamp > (now() - interval '30 days');

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread 
  ON messages(receiver_username, status, timestamp DESC)
  WHERE status != 'read';

-- Optimize user queries
CREATE INDEX IF NOT EXISTS idx_users_last_seen_optimized 
  ON users(last_seen DESC)
  WHERE last_seen > (now() - interval '7 days');

-- Add function to clean up old typing status entries
CREATE OR REPLACE FUNCTION cleanup_old_typing_status()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_status 
  WHERE timestamp < (now() - interval '1 minute');
END;
$$ LANGUAGE plpgsql;

-- Add function to get recent messages efficiently
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
  timestamp timestamptz,
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
    m.timestamp,
    m.status,
    m.is_edited,
    m.edited_at,
    m.chunk_info
  FROM messages m
  WHERE 
    (m.sender_username = user1 AND m.receiver_username = user2) OR
    (m.sender_username = user2 AND m.receiver_username = user1)
  ORDER BY m.timestamp DESC
  LIMIT message_limit;
END;
$$ LANGUAGE plpgsql;

-- Create a view for active users (online in last 5 minutes)
CREATE OR REPLACE VIEW active_users AS
SELECT 
  username,
  last_seen,
  created_at,
  CASE 
    WHEN last_seen > (now() - interval '5 minutes') THEN true
    ELSE false
  END as is_online
FROM users
ORDER BY is_online DESC, last_seen DESC;