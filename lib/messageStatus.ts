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
 * Edit a message (within 5 minutes of sending)
 */
export async function editMessage(
  messageId: string,
  newContent: string,
  senderUsername: string,
  privateKey: string
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
    const messageTime = new Date(originalMessage.timestamp);
    const now = new Date();
    const timeDiff = now.getTime() - messageTime.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDiff > fiveMinutes) {
      console.error('Message edit window has expired');
      return false;
    }

    // Get sender's public key for encryption
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('public_key')
      .eq('username', senderUsername)
      .single();

    if (senderError || !sender) {
      console.error('Sender not found:', senderError);
      return false;
    }

    // Encrypt the new content
    const { encryptMessage, importPublicKey } = await import('./encryption');
    const senderPublicKey = await importPublicKey(sender.public_key);
    const encryptedContent = await encryptMessage(newContent, senderPublicKey);

    // Store edit history
    const editHistory = originalMessage.edit_history || [];
    editHistory.push({
      content: originalMessage.encrypted_content,
      editedAt: originalMessage.edited_at || originalMessage.timestamp
    });

    // Update the message
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        encrypted_content: encryptedContent,
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