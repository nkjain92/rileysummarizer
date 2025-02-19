import { PostgrestError } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Base record types from Supabase schema
export interface BaseRecord {
  id: string;
  created_at: string;
}

export interface ProfileRecord extends BaseRecord {
  name: string;
}

export interface ChannelRecord extends BaseRecord {
  name: string;
  url: string;
  subscriber_count: number;
}

export interface ContentRecord {
  id: string;
  content_type: string;
  unique_identifier: string;
  title: string;
  url: string;
  transcript: string;
  published_at: string;
  created_at: string;
  source_id: string | null;
  search_vector: unknown | null;
}

export interface SummaryRecord {
  id: string;
  content_id: string;
  summary: string;
  summary_type: string;
  created_at: string;
}

export interface TagRecord {
  id: string;
  name: string;
}

export interface ContentTagRecord {
  content_id: string;
  tag_id: string;
}

export interface UserSummaryHistoryRecord {
  id: string;
  user_id: string;
  content_id: string;
  summary_id: string;
  generated_at: string;
}

// Input types for creating records
export type CreateProfileInput = Omit<ProfileRecord, 'id' | 'created_at'>;
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