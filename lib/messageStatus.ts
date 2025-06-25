import { supabase } from './supabase';

export type MessageStatusType = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageWithStatus {
  id: string;
  content: string;
  status: MessageStatusType;
  timestamp: string;
  editedAt?: string;
  isEdited?: boolean;
  editHistory?: Array<{
    content: string;
    editedAt: string;
  }>;
}

/**
 * Update message status in the database
 */
export async function updateMessageStatus(
  messageId: string,
  status: MessageStatusType
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error updating message status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateMessageStatus:', error);
    return false;
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(
  messageId: string,
  readerUsername: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('message_reads')
      .upsert({
        message_id: messageId,
        reader_username: readerUsername,
        read_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markMessageAsRead:', error);
    return false;
  }
}

/**
 * Edit a message (within 5 minutes of sending) - Simplified without encryption
 */
export async function editMessage(
  messageId: string,
  newContent: string,
  senderUsername: string
): Promise<boolean> {
  try {
    // First, get the original message to check if editing is allowed
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('sender_username', senderUsername)
      .single();

    if (fetchError || !originalMessage) {
      console.error('Message not found or not authorized to edit');
      return false;
    }

    // Check if message is within 5-minute edit window
    const messageTime = new Date(originalMessage.message_timestamp);
    const now = new Date();
    const timeDiff = now.getTime() - messageTime.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDiff > fiveMinutes) {
      console.error('Message edit window has expired');
      return false;
    }

    // Validate new content
    if (!newContent || newContent.trim().length === 0) {
      console.error('New content cannot be empty');
      return false;
    }

    // Sanitize content (basic XSS prevention)
    const sanitizedContent = newContent.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Store edit history
    const editHistory = originalMessage.edit_history || [];
    editHistory.push({
      content: originalMessage.content,
      editedAt: originalMessage.edited_at || originalMessage.message_timestamp
    });

    // Update the message
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        content: sanitizedContent,
        is_edited: true,
        edited_at: new Date().toISOString(),
        edit_history: editHistory
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in editMessage:', error);
    return false;
  }
}

/**
 * Check if a message can be edited
 */
export function canEditMessage(
  messageTimestamp: string,
  senderUsername: string,
  currentUsername: string
): boolean {
  // Only sender can edit their own messages
  if (senderUsername !== currentUsername) {
    return false;
  }

  // Check if within 5-minute edit window
  const messageTime = new Date(messageTimestamp);
  const now = new Date();
  const timeDiff = now.getTime() - messageTime.getTime();
  const fiveMinutes = 5 * 60 * 1000;

  return timeDiff <= fiveMinutes;
}

/**
 * Batch mark multiple messages as delivered
 */
export async function batchMarkAsDelivered(
  messageIds: string[]
): Promise<boolean> {
  try {
    if (messageIds.length === 0) return true;

    const { error } = await supabase
      .from('messages')
      .update({ 
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .in('id', messageIds)
      .eq('status', 'sent'); // Only update messages that are currently 'sent'

    if (error) {
      console.error('Error batch marking messages as delivered:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in batchMarkAsDelivered:', error);
    return false;
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(
  username: string,
  fromUsername?: string
): Promise<number> {
  try {
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_username', username)
      .neq('status', 'read');

    if (fromUsername) {
      query = query.eq('sender_username', fromUsername);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadMessageCount:', error);
    return 0;
  }
}