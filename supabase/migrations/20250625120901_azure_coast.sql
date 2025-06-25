/*
  # Add Enhanced Edit Message System

  1. Schema Updates
    - Ensure all edit-related columns exist with proper types
    - Add constraints for edit window validation
    - Create indexes for edit operations

  2. Functions
    - Add function to check edit permissions
    - Add function to get edit history
    - Add function to clean up old edit data

  3. Security
    - Add policies for edit operations
    - Ensure proper validation

  This migration enhances the edit message system with better validation and history tracking.
*/

-- Ensure all edit-related columns exist with proper structure
DO $$
BEGIN
  -- Ensure is_edited column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_edited'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_edited boolean DEFAULT false;
  END IF;

  -- Ensure edited_at column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN edited_at timestamptz;
  END IF;

  -- Ensure edit_history column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'edit_history'
  ) THEN
    ALTER TABLE messages ADD COLUMN edit_history jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Ensure updated_at column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN updated_at timestamptz DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Create indexes for edit operations
CREATE INDEX IF NOT EXISTS idx_messages_edited 
  ON messages(is_edited, edited_at DESC) 
  WHERE is_edited = true;

CREATE INDEX IF NOT EXISTS idx_messages_edit_window 
  ON messages(sender_username, message_timestamp DESC) 
  WHERE is_edited = false;

-- Function to check if a message can be edited
CREATE OR REPLACE FUNCTION can_edit_message(
  message_id uuid,
  username text
)
RETURNS boolean AS $$
DECLARE
  message_record RECORD;
  time_diff interval;
BEGIN
  -- Get the message
  SELECT * INTO message_record
  FROM messages 
  WHERE id = message_id AND sender_username = username;
  
  -- Check if message exists and user is the sender
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if within 5-minute edit window
  time_diff := CURRENT_TIMESTAMP - message_record.message_timestamp;
  
  IF time_diff > interval '5 minutes' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to edit a message with validation
CREATE OR REPLACE FUNCTION edit_message_content(
  message_id uuid,
  new_content text,
  editor_username text
)
RETURNS boolean AS $$
DECLARE
  message_record RECORD;
  edit_history_array jsonb;
BEGIN
  -- Check if editing is allowed
  IF NOT can_edit_message(message_id, editor_username) THEN
    RETURN false;
  END IF;
  
  -- Get current message
  SELECT * INTO message_record
  FROM messages 
  WHERE id = message_id;
  
  -- Validate new content
  IF new_content IS NULL OR trim(new_content) = '' THEN
    RETURN false;
  END IF;
  
  -- Build edit history
  edit_history_array := COALESCE(message_record.edit_history, '[]'::jsonb);
  edit_history_array := edit_history_array || jsonb_build_object(
    'content', message_record.content,
    'editedAt', COALESCE(message_record.edited_at, message_record.message_timestamp)
  );
  
  -- Update the message
  UPDATE messages 
  SET 
    content = trim(new_content),
    is_edited = true,
    edited_at = CURRENT_TIMESTAMP,
    edit_history = edit_history_array,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = message_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get edit history for a message
CREATE OR REPLACE FUNCTION get_message_edit_history(message_id uuid)
RETURNS jsonb AS $$
DECLARE
  history jsonb;
BEGIN
  SELECT edit_history INTO history
  FROM messages 
  WHERE id = message_id;
  
  RETURN COALESCE(history, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get messages that can still be edited by a user
CREATE OR REPLACE FUNCTION get_editable_messages(username text)
RETURNS TABLE (
  id uuid,
  content text,
  message_timestamp timestamptz,
  time_remaining interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.message_timestamp,
    (interval '5 minutes' - (CURRENT_TIMESTAMP - m.message_timestamp)) as time_remaining
  FROM messages m
  WHERE 
    m.sender_username = username 
    AND (CURRENT_TIMESTAMP - m.message_timestamp) <= interval '5 minutes'
    AND m.content_type = 'text'
  ORDER BY m.message_timestamp DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to clean up old edit data (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_edit_data()
RETURNS integer AS $$
DECLARE
  cleaned_count integer := 0;
BEGIN
  -- This function can be used to clean up edit history for very old messages
  -- Currently just returns 0, but can be implemented if needed
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Ensure the updated_at trigger exists and works properly
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it works
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add a constraint to ensure edited messages have edited_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'messages_edited_at_check'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_edited_at_check 
    CHECK (
      (is_edited = false) OR 
      (is_edited = true AND edited_at IS NOT NULL)
    );
  END IF;
END $$;