export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          created_at?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          name: string;
          url: string;
          subscriber_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          url: string;
          subscriber_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          subscriber_count?: number;
          created_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          channel_id: string;
          unique_identifier: string;
          title: string;
          url: string;
          transcript_path: string;
          language: string;
          metadata: Json | null;
          published_at: string;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id: string;
          channel_id: string;
          unique_identifier: string;
          title: string;
          url: string;
          transcript_path: string;
          language?: string;
          metadata?: Json | null;
          published_at: string;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          unique_identifier?: string;
          title?: string;
          url?: string;
          transcript_path?: string;
          language?: string;
          metadata?: Json | null;
          published_at?: string;
          last_updated?: string;
          created_at?: string;
        };
      };
      user_summaries: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          summary: string;
          detailed_summary: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          summary: string;
          detailed_summary?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_id?: string;
          summary?: string;
          detailed_summary?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      content_tags: {
        Row: {
          content_id: string;
          tag_id: string;
          content_type: 'video' | 'summary';
        };
        Insert: {
          content_id: string;
          tag_id: string;
          content_type: 'video' | 'summary';
        };
        Update: {
          content_id?: string;
          tag_id?: string;
          content_type?: 'video' | 'summary';
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          subscription_type: 'channel';
          subscription_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_type: 'channel';
          subscription_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_type?: 'channel';
          subscription_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      subscription_type: 'channel';
    };
  };
}

export type Tables = Database['public']['Tables'];
export type VideoRecord = Tables['videos']['Row'] & { channel?: ChannelRecord | null };
export type UserSummaryRecord = Tables['user_summaries']['Row'] & { videos?: VideoRecord | null };
export type ChannelRecord = Tables['channels']['Row'];
export type ProfileRecord = Tables['profiles']['Row'];
export type TagRecord = Tables['tags']['Row'];
export type ContentTagRecord = Tables['content_tags']['Row'];
export type SubscriptionRecord = Tables['subscriptions']['Row'] & { channels?: ChannelRecord | null }; 