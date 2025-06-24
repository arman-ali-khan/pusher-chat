import { supabase } from './supabase';
import { encryptMessage, decryptMessage, importPublicKey, importPrivateKey } from './encryption';

export interface Message {
  id: string;
  sender_username: string;
  receiver_username: string;
  content: string;
  content_type: 'text' | 'image' | 'emoji';
  timestamp: string;
  decrypted?: boolean;
}

export interface User {
  username: string;
  public_key: string;
  last_seen: string;
  created_at: string;
}

export interface TypingStatus {
  username: string;
  isTyping: boolean;
  timestamp: string;
}

/**
 * Send encrypted message to another user
 */
export async function sendMessage(
  senderUsername: string,
  receiverUsername: string,
  content: string,
  contentType: 'text' | 'image' | 'emoji' = 'text'
): Promise<boolean> {
  try {
    // Get receiver's public key
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('public_key')
      .eq('username', receiverUsername)
      .single();

    if (receiverError || !receiver) {
      console.error('Receiver not found:', receiverError);
      return false;
    }

    // Get sender's public key for self-encryption
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('public_key')
      .eq('username', senderUsername)
      .single();

    if (senderError || !sender) {
      console.error('Sender not found:', senderError);
      return false;
    }

    // Encrypt message for receiver
    const receiverPublicKey = await importPublicKey(receiver.public_key);
    const encryptedForReceiver = await encryptMessage(content, receiverPublicKey);

    // Encrypt message for sender (so they can see their own messages)
    const senderPublicKey = await importPublicKey(sender.public_key);
    const encryptedForSender = await encryptMessage(content, senderPublicKey);

    // Store two copies of the message - one for each participant
    const messages = [
      {
        sender_username: senderUsername,
        receiver_username: receiverUsername,
        encrypted_content: encryptedForReceiver,
        content_type: contentType,
      },
      {
        sender_username: senderUsername,
        receiver_username: senderUsername, // Self-message for sender to decrypt
        encrypted_content: encryptedForSender,
        content_type: contentType,
        original_receiver: receiverUsername, // Track the original receiver
      }
    ];

    const { error: messageError } = await supabase
      .from('messages')
      .insert(messages);

    if (messageError) {
      console.error('Error sending message:', messageError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return false;
  }
}

/**
 * Get messages between two users and decrypt them
 */
export async function getMessages(
  currentUsername: string,
  otherUsername: string,
  privateKeyString: string
): Promise<Message[]> {
  try {
    // Get messages where current user is involved
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_username.eq.${currentUsername},receiver_username.eq.${otherUsername}),and(sender_username.eq.${otherUsername},receiver_username.eq.${currentUsername}),and(sender_username.eq.${currentUsername},receiver_username.eq.${currentUsername})`)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    if (!messages) return [];

    // Decrypt messages
    const privateKey = await importPrivateKey(privateKeyString);
    const decryptedMessages: Message[] = [];
    const processedMessages = new Map<string, boolean>();

    for (const message of messages) {
      try {
        // Only decrypt messages where current user is the receiver or it's a self-message
        if (message.receiver_username === currentUsername) {
          const decryptedContent = await decryptMessage(message.encrypted_content, privateKey);
          
          // For self-messages (sender's copy), use original_receiver if available, otherwise use otherUsername
          const actualReceiver = message.original_receiver || 
            (message.sender_username === currentUsername && message.receiver_username === currentUsername ? otherUsername : message.receiver_username);
          
          // Create a unique key for deduplication based on content, sender, and timestamp
          const messageKey = `${message.sender_username}-${decryptedContent}-${message.timestamp}-${message.content_type}`;
          
          if (!processedMessages.has(messageKey)) {
            processedMessages.set(messageKey, true);
            
            decryptedMessages.push({
              id: message.id,
              sender_username: message.sender_username,
              receiver_username: actualReceiver,
              content: decryptedContent,
              content_type: message.content_type,
              timestamp: message.timestamp,
              decrypted: true,
            });
          }
        }
      } catch (decryptError) {
        console.error('Decryption failed for message:', message.id, decryptError);
        // Skip messages that can't be decrypted
      }
    }

    // Sort by timestamp
    return decryptedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error('Error in getMessages:', error);
    return [];
  }
}

/**
 * Get all users
 */
export async function getUsers(): Promise<User[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
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
 * Create or update user
 */
export async function createOrUpdateUser(username: string, publicKey: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        username,
        public_key: publicKey,
        last_seen: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating/updating user:', error);
      return false;
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
          timestamp: new Date().toISOString(),
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
      .gte('timestamp', new Date(Date.now() - 10000).toISOString()); // Only get recent typing (within 10 seconds)

    if (error) {
      console.error('Error fetching typing status:', error);
      return [];
    }

    return (typingData || []).map(item => ({
      username: item.username,
      isTyping: item.is_typing,
      timestamp: item.timestamp,
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