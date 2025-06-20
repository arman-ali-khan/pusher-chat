import { ObjectId } from 'mongodb';

export interface Channel {
  _id?: ObjectId;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  participants: ObjectId[];
  admins: ObjectId[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  isArchived: boolean;
  settings: {
    encryption: boolean;
    readReceipts: boolean;
    typingIndicators: boolean;
  };
  messageCount: number;
}

export interface ChannelMember {
  _id?: ObjectId;
  channelId: ObjectId;
  userId: ObjectId;
  role: 'admin' | 'member';
  joinedAt: Date;
  lastReadMessageId?: ObjectId;
  notificationSettings: {
    muted: boolean;
    mentions: boolean;
  };
}