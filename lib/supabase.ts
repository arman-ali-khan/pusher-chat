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
          last_seen: string;
          created_at: string;
        };
        Insert: {
          username: string;
          last_seen?: string;
          created_at?: string;
        };
        Update: {
          username?: string;
          last_seen?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_username: string;
          receiver_username: string;
          content: string;
          content_type: string;
          message_timestamp: string;
          status?: string;
          is_edited?: boolean;
          edited_at?: string;
          edit_history?: any;
          chunk_info?: any;
          original_receiver?: string;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          sender_username: string;
          receiver_username: string;
          content: string;
          content_type?: string;
          message_timestamp?: string;
          status?: string;
          is_edited?: boolean;
          edited_at?: string;
          edit_history?: any;
          chunk_info?: any;
          original_receiver?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_username?: string;
          receiver_username?: string;
          content?: string;
          content_type?: string;
          message_timestamp?: string;
          status?: string;
          is_edited?: boolean;
          edited_at?: string;
          edit_history?: any;
          chunk_info?: any;
          original_receiver?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      typing_status: {
        Row: {
          id: string;
          username: string;
          conversation_with: string;
          is_typing: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          conversation_with: string;
          is_typing?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          conversation_with?: string;
          is_typing?: boolean;
          updated_at?: string;
        };
      };
      message_reads: {
        Row: {
          id: string;
          message_id: string;
          reader_username: string;
          read_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          reader_username: string;
          read_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          reader_username?: string;
          read_at?: string;
          created_at?: string;
        };
      };
    };
  };
};