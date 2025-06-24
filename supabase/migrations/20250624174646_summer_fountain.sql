/*
  # Fix Policy Error for Message Reads

  1. Drop existing policy if it exists
  2. Recreate the policy with proper conditions
  3. Ensure no duplicate policies exist

  This migration fixes the "policy already exists" error.
*/

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on message_reads" ON message_reads;

-- Recreate the policy with a unique name
CREATE POLICY "message_reads_full_access" ON message_reads
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Ensure the table exists and RLS is enabled
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Add any missing indexes
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id 
  ON message_reads(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reads_reader 
  ON message_reads(reader_username, read_at DESC);