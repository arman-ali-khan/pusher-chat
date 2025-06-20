import { ObjectId } from 'mongodb';

export interface Message {
  _id?: ObjectId;
  channelId: ObjectId;
  senderId: ObjectId;
  senderAddress: string;
  content: string;
  encryptedContent?: string;
  signature: string;
  messageType: 'text' | 'image' | 'file' | 'emoji';
  replyTo?: ObjectId;
  mentions: string[];
  reactions: Reaction[];
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  deliveredTo: string[];
  readBy: ReadReceipt[];
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface ReadReceipt {
  userId: ObjectId;
  readAt: Date;
}

export interface TypingIndicator {
  channelId: string;
  userId: string;
  username: string;
  timestamp: Date;
}