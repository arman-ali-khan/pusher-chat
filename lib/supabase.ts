import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          username: string;
          public_key: string;
          last_seen: string;
          created_at: string;
        };
        Insert: {
          username: string;
          public_key: string;
          last_seen?: string;
          created_at?: string;
        };
        Update: {
          username?: string;
          public_key?: string;
          last_seen?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_username: string;
          receiver_username: string;
          encrypted_content: string;
          content_type: string;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_username: string;
          receiver_username: string;
          encrypted_content: string;
          content_type?: string;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_username?: string;
          receiver_username?: string;
          encrypted_content?: string;
          content_type?: string;
          timestamp?: string;
          created_at?: string;
        };
      };
    };
  };
};