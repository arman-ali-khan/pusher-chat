import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  username: string;
  phoneNumber?: string;
  ensName?: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  reputation: number;
  blockedUsers: string[];
  settings: {
    notifications: boolean;
    darkMode: boolean;
    encryption: boolean;
  };
}

export interface UserSession {
  _id?: ObjectId;
  userId: ObjectId;
  username: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
}