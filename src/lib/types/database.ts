import { Database as SupabaseDatabase } from '@/lib/types/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = SupabaseDatabase;
export type Tables = Database['public']['Tables'];

// Base record types from Supabase schema
export type ProfileRecord = Tables['profiles']['Row'];
export type ChannelRecord = Tables['channels']['Row'];
export type ContentRecord = Tables['content']['Row'];
export type SummaryRecord = Tables['summaries']['Row'];
export type TagRecord = Tables['tags']['Row'];
export type ContentTagRecord = Tables['content_tags']['Row'];
export type UserSummaryHistoryRecord = Tables['user_summary_history']['Row'];

// Input types for creating records
export type CreateProfileInput = Omit<ProfileRecord, 'created_at'>;
export type CreateChannelInput = Omit<ChannelRecord, 'created_at'>;
export type CreateContentInput = Omit<ContentRecord, 'created_at'>;
export type CreateSummaryInput = Omit<SummaryRecord, 'id' | 'created_at'>;
export type CreateTagInput = Omit<TagRecord, 'id'>;
export type CreateContentTagInput = ContentTagRecord;
export type CreateUserSummaryHistoryInput = Omit<UserSummaryHistoryRecord, 'id' | 'generated_at'>;

// Extended types with relationships
export interface ContentWithRelations extends ContentRecord {
  channel?: ChannelRecord;
  summaries?: SummaryRecord[];
  tags?: TagRecord[];
}

export interface SummaryWithRelations extends SummaryRecord {
  content?: ContentWithRelations;
}

export interface UserSummaryWithRelations extends UserSummaryHistoryRecord {
  content?: ContentWithRelations;
  summary?: SummaryRecord;
}