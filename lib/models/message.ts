export interface Message {
  id?: string;
  channel_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  encrypted_content?: string;
  signature: string;
  message_type: 'text' | 'image' | 'file' | 'emoji';
  reply_to?: string;
  mentions: string[];
  reactions: Reaction[];
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  delivered_to: string[];
  read_by: ReadReceipt[];
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface ReadReceipt {
  user_id: string;
  read_at: string;
}

export interface TypingIndicator {
  channel_id: string;
  user_id: string;
  username: string;
  timestamp: string;
}