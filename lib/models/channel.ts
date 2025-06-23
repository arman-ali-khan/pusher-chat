export interface Channel {
  id?: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  participants: string[];
  admins: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  is_archived: boolean;
  settings: {
    encryption: boolean;
    read_receipts: boolean;
    typing_indicators: boolean;
  };
  message_count: number;
}

export interface ChannelMember {
  id?: string;
  channel_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_message_id?: string;
  notification_settings: {
    muted: boolean;
    mentions: boolean;
  };
}