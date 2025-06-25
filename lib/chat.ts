import { supabase } from './supabase';

export interface Message {
  id: string;
  sender_username: string;
  receiver_username: string;
  content: string;
  content_type: 'text' | 'image';
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  is_edited?: boolean;
  edited_at?: string;
}

export interface User {
  username: string;
  last_seen: string;
  created_at: string;
}

export interface TypingStatus {
  username: string;
  isTyping: boolean;
  timestamp: string;
}

/**
 * Send message to another user (optimized for performance)
 * Handles large messages by chunking them if necessary
 */
export async function sendMessage(
  senderUsername: string,
  receiverUsername: string,
  content: string,
  contentType: 'text' | 'image' = 'text'
): Promise<boolean> {
  try {
    // Validate input
    if (!senderUsername || !receiverUsername || !content) {
      console.error('Invalid message parameters');
      return false;
    }

    // Handle large messages by chunking (>1000 characters for text)
    if (contentType === 'text' && content.length > 1000) {
      return await sendLargeMessage(senderUsername, receiverUsername, content);
    }

    // For regular messages, store directly without encryption
    const messageData = {
      sender_username: senderUsername,
      receiver_username: receiverUsername,
      content: content,
      content_type: contentType,
      status: 'sent',
      message_timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('messages')
      .insert([messageData]);

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return false;
  }
}

/**
 * Handle large messages by splitting them into chunks
 */
async function sendLargeMessage(
  senderUsername: string,
  receiverUsername: string,
  content: string
): Promise<boolean> {
  try {
    const chunkSize = 800; // Conservative chunk size
    const chunks = [];
    
    // Split content into chunks
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Send chunks with metadata
    const chunkMessages = chunks.map((chunk, index) => ({
      sender_username: senderUsername,
      receiver_username: receiverUsername,
      content: chunk,
      content_type: 'text',
      status: 'sent',
      message_timestamp: timestamp,
      chunk_info: {
        message_id: messageId,
        chunk_index: index,
        total_chunks: chunks.length,
        is_chunked: true
      }
    }));

    const { error } = await supabase
      .from('messages')
      .insert(chunkMessages);

    if (error) {
      console.error('Error sending chunked message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendLargeMessage:', error);
    return false;
  }
}

/**
 * Get messages between two users (optimized query)
 */
export async function getMessages(
  currentUsername: string,
  otherUsername: string
): Promise<Message[]> {
  try {
    // Optimized query with proper indexing
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_username.eq.${currentUsername},receiver_username.eq.${otherUsername}),and(sender_username.eq.${otherUsername},receiver_username.eq.${currentUsername})`)
      .order('message_timestamp', { ascending: true })
      .limit(100); // Limit to recent messages for performance

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    if (!messages) return [];

    // Process chunked messages
    const processedMessages = await processChunkedMessages(messages);
    
    return processedMessages.map(message => ({
      id: message.id,
      sender_username: message.sender_username,
      receiver_username: message.receiver_username,
      content: message.content,
      content_type: message.content_type,
      timestamp: message.message_timestamp,
      status: message.status || 'sent',
      is_edited: message.is_edited || false,
      edited_at: message.edited_at
    }));
  } catch (error) {
    console.error('Error in getMessages:', error);
    return [];
  }
}

/**
 * Process and reconstruct chunked messages
 */
async function processChunkedMessages(messages: any[]): Promise<any[]> {
  const chunkedGroups = new Map<string, any[]>();
  const regularMessages: any[] = [];

  // Separate chunked and regular messages
  messages.forEach(message => {
    if (message.chunk_info?.is_chunked) {
      const messageId = message.chunk_info.message_id;
      if (!chunkedGroups.has(messageId)) {
        chunkedGroups.set(messageId, []);
      }
      chunkedGroups.get(messageId)!.push(message);
    } else {
      regularMessages.push(message);
    }
  });

  // Reconstruct chunked messages
  const reconstructedMessages: any[] = [];
  chunkedGroups.forEach((chunks, messageId) => {
    // Sort chunks by index
    chunks.sort((a, b) => a.chunk_info.chunk_index - b.chunk_info.chunk_index);
    
    // Check if all chunks are present
    const expectedChunks = chunks[0]?.chunk_info?.total_chunks || 0;
    if (chunks.length === expectedChunks) {
      // Reconstruct the full message
      const fullContent = chunks.map(chunk => chunk.content).join('');
      const baseMessage = chunks[0];
      
      reconstructedMessages.push({
        ...baseMessage,
        content: fullContent,
        chunk_info: undefined // Remove chunk info from final message
      });
    } else {
      // If chunks are missing, add individual chunks as separate messages
      reconstructedMessages.push(...chunks);
    }
  });

  return [...regularMessages, ...reconstructedMessages];
}

/**
 * Get all users (simplified without public keys)
 */
export async function getUsers(): Promise<User[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('username, last_seen, created_at')
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return users || [];
  } catch (error) {
    console.error('Error in getUsers:', error);
    return [];
  }
}

/**
 * Create or update user (simplified and fixed)
 */
export async function createOrUpdateUser(username: string): Promise<boolean> {
  try {
    // Basic input validation
    if (!username || username.trim().length < 2) {
      console.error('Invalid username');
      return false;
    }

    // Sanitize username
    const sanitizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    
    if (sanitizedUsername.length < 2) {
      console.error('Username too short after sanitization');
      return false;
    }

    // First, try to check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('username')
      .eq('username', sanitizedUsername)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error checking existing user:', checkError);
      return false;
    }

    const now = new Date().toISOString();

    if (existingUser) {
      // User exists, update last_seen
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          last_seen: now 
        })
        .eq('username', sanitizedUsername);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return false;
      }
    } else {
      // User doesn't exist, create new user
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          username: sanitizedUsername,
          last_seen: now,
          created_at: now
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    return false;
  }
}

/**
 * Update user's last seen timestamp
 */
export async function updateLastSeen(username: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('username', username);
  } catch (error) {
    console.error('Error updating last seen:', error);
  }
}

/**
 * Set typing status for a user in a conversation
 */
export async function setTypingStatus(
  username: string,
  conversationWith: string,
  isTyping: boolean
): Promise<void> {
  try {
    if (isTyping) {
      // Insert or update typing status
      await supabase
        .from('typing_status')
        .upsert({
          username,
          conversation_with: conversationWith,
          is_typing: true,
          updated_at: new Date().toISOString(),
        });
    } else {
      // Remove typing status
      await supabase
        .from('typing_status')
        .delete()
        .eq('username', username)
        .eq('conversation_with', conversationWith);
    }
  } catch (error) {
    console.error('Error setting typing status:', error);
  }
}

/**
 * Get typing status for a conversation
 */
export async function getTypingStatus(
  currentUsername: string,
  otherUsername: string
): Promise<TypingStatus[]> {
  try {
    const { data: typingData, error } = await supabase
      .from('typing_status')
      .select('*')
      .eq('conversation_with', currentUsername)
      .eq('username', otherUsername)
      .gte('updated_at', new Date(Date.now() - 10000).toISOString()); // Only get recent typing (within 10 seconds)

    if (error) {
      console.error('Error fetching typing status:', error);
      return [];
    }

    return (typingData || []).map(item => ({
      username: item.username,
      isTyping: item.is_typing,
      timestamp: item.updated_at,
    }));
  } catch (error) {
    console.error('Error in getTypingStatus:', error);
    return [];
  }
}

/**
 * Subscribe to typing status changes
 */
export function subscribeToTypingStatus(
  currentUsername: string,
  callback: (typingUsers: TypingStatus[]) => void
) {
  const channel = supabase
    .channel('typing_status')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_status',
        filter: `conversation_with=eq.${currentUsername}`,
      },
      () => {
        // Refetch typing status when changes occur
        // This will be handled by the component
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Batch update message status for better performance
 */
export async function batchUpdateMessageStatus(
  messageIds: string[],
  status: 'delivered' | 'read'
): Promise<boolean> {
  try {
    if (messageIds.length === 0) return true;

    const { error } = await supabase
      .from('messages')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', messageIds);

    if (error) {
      console.error('Error batch updating message status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in batchUpdateMessageStatus:', error);
    return false;
  }
}

/**
 * Get message count for pagination
 */
export async function getMessageCount(
  currentUsername: string,
  otherUsername: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .or(`and(sender_username.eq.${currentUsername},receiver_username.eq.${otherUsername}),and(sender_username.eq.${otherUsername},receiver_username.eq.${currentUsername})`);

    if (error) {
      console.error('Error getting message count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getMessageCount:', error);
    return 0;
  }
}
