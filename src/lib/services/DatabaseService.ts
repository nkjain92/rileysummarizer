import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";
import {
  ContentRecord,
  UserSummaryHistoryRecord,
  ChannelRecord,
  ProfileRecord,
  TagRecord,
  ContentTagRecord,
  CreateChannelInput,
  CreateContentInput,
  CreateSummaryInput,
  CreateTagInput,
  SummaryRecord,
  ContentWithRelations,
  SummaryWithRelations,
  UserSummaryWithRelations,
} from '@/lib/types/database';
import { supabase } from "@/lib/utils/supabaseClient";
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Base service class for database operations using Supabase
 */
export class DatabaseService {
  protected logger;

  constructor(context: string) {
    this.logger = logger.withContext({ service: context });
  }

  // Profile methods
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        this.logger.error("Error fetching profile:", error, { userId });
        throw new AppError(
          "Failed to fetch profile",
          ErrorCode.DATABASE_ERROR,
          HttpStatus.INTERNAL_ERROR
        );
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      this.logger.error("Unexpected error in getProfile:", err as Error | PostgrestError, { userId });
      throw new AppError(
        "An unexpected error occurred while fetching the profile",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }
  }

  async upsertProfile(profile: Omit<ProfileRecord, 'created_at'>): Promise<ProfileRecord> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
        .single();

      if (error) {
        this.logger.error("Error upserting profile:", error, { profile });
        throw new AppError(
          "Failed to upsert profile",
          ErrorCode.DATABASE_ERROR,
          HttpStatus.INTERNAL_ERROR
        );
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      this.logger.error("Unexpected error in upsertProfile:", err as Error | PostgrestError, { profile });
      throw new AppError(
        "An unexpected error occurred while upserting the profile",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }
  }

  // Channel methods
  async findChannelById(id: string): Promise<ChannelRecord | null> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error("Error fetching channel:", error, { id });
      return null;
    }

    return data;
  }

  async upsertChannel(channel: Omit<ChannelRecord, 'created_at'>): Promise<ChannelRecord> {
    const { data, error } = await supabase
      .from('channels')
      .upsert(channel)
      .select()
      .single();

    if (error) {
      this.logger.error("Error upserting channel:", error, { channel });
      throw new AppError(
        "Failed to upsert channel",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return data;
  }

  async findOrCreateChannel(input: CreateChannelInput): Promise<ChannelRecord> {
    try {
      // First try to find the channel
      const { data: existingChannel, error: findError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', input.id)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (existingChannel) {
        // Update channel name if it's 'Unknown Channel'
        if (existingChannel.name === 'Unknown Channel' && input.name !== 'Unknown Channel') {
          const { data: updatedChannel, error: updateError } = await supabase
            .from('channels')
            .update({ name: input.name })
            .eq('id', input.id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          return updatedChannel;
        }
        return existingChannel;
      }

      // If channel doesn't exist, create it
      const { data: newChannel, error: createError } = await supabase
        .from('channels')
        .insert([{
          ...input,
          name: input.name || 'Unknown Channel', // Ensure we always have a name
        }])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newChannel;
    } catch (error) {
      logger.error('Error in findOrCreateChannel:', error as Error | PostgrestError, { channelId: input.id });
      throw new AppError(
        'Failed to find or create channel',
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR,
      );
    }
  }

  // Video methods
  async findVideoById(id: string): Promise<ContentRecord | null> {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error("Error fetching video:", error, { id });
      return null;
    }

    const channel = await this.findChannelById(data.source_id || '');
    return {
      ...data,
      channel
    };
  }

  async createVideo(video: Omit<ContentRecord, 'created_at'>): Promise<ContentRecord> {
    const { data, error } = await supabase
      .from('videos')
      .insert(video)
      .select()
      .single();

    if (error) {
      this.logger.error("Error creating video:", error, { video });
      throw new AppError(
        "Failed to create video",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    const channel = await this.findChannelById(data.source_id || '');
    return {
      ...data,
      channel
    };
  }

  async updateVideo(id: string, video: Partial<ContentRecord>): Promise<ContentRecord> {
    const { data, error } = await supabase
      .from('videos')
      .update(video)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error("Error updating video:", error, { id, video });
      throw new AppError(
        "Failed to update video",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    const channel = await this.findChannelById(data.source_id || '');
    return {
      ...data,
      channel
    };
  }

  // Summary methods
  async getUserSummaries(userId: string): Promise<UserSummaryHistoryRecord[]> {
    const { data, error } = await supabase
      .from('user_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error("Error fetching user summaries:", error, { userId });
      throw new AppError(
        "Failed to fetch user summaries",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    const summaries = data.map(async s => {
      const video = await this.findVideoById(s.video_id);
      return {
        ...s,
        videos: video
      };
    });

    return Promise.all(summaries);
  }

  async createUserSummary(summary: Omit<UserSummaryHistoryRecord, 'id' | 'created_at' | 'updated_at'>): Promise<UserSummaryHistoryRecord> {
    const { data, error } = await supabase
      .from('user_summaries')
      .insert(summary)
      .select()
      .single();

    if (error) {
      this.logger.error("Error creating user summary:", error, { summary });
      throw new AppError(
        "Failed to create user summary",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    const video = await this.findVideoById(data.video_id);
    return {
      ...data,
      videos: video
    };
  }

  async updateUserSummary(id: string, summary: Partial<UserSummaryHistoryRecord>): Promise<UserSummaryHistoryRecord> {
    const { data, error } = await supabase
      .from('user_summaries')
      .update(summary)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error("Error updating user summary:", error, { id, summary });
      throw new AppError(
        "Failed to update user summary",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    const video = await this.findVideoById(data.video_id);
    return {
      ...data,
      videos: video
    };
  }

  async findSummaryByVideoId(videoId: string, userId: string): Promise<UserSummaryHistoryRecord | null> {
    const { data, error } = await supabase
      .from('user_summaries')
      .select('*')
      .eq('video_id', videoId)
      .eq('user_id', userId)
      .single();

    if (error) {
      this.logger.error("Error fetching summary by video ID:", error, { videoId, userId });
      return null;
    }

    const video = await this.findVideoById(videoId);
    return {
      ...data,
      videos: video
    };
  }

  async getUserSummaryHistory(userId: string): Promise<UserSummaryWithRelations[]> {
    const { data, error } = await supabase
      .from('user_summary_history')
      .select('*, content:content(*), summary:summaries(*)')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false });

    if (error) {
      this.logger.error("Error fetching user summary history:", error, { userId });
      throw new AppError(
        "Failed to fetch user summary history",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return data;
  }

  async createUserSummaryHistory(userId: string, contentId: string, summaryId: string): Promise<void> {
    const { error } = await supabase
      .from('user_summary_history')
      .insert({
        user_id: userId,
        content_id: contentId,
        summary_id: summaryId,
      });

    if (error) {
      this.logger.error("Error creating user summary history:", error, { userId, contentId, summaryId });
      throw new AppError(
        "Failed to create user summary history",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }
  }

  async findSummaryByContentId(contentId: string): Promise<SummaryWithRelations | null> {
    const { data, error } = await supabase
      .from('summaries')
      .select('*, content:content(*)')
      .eq('content_id', contentId)
      .eq('summary_type', 'short')
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error("Error fetching summary:", error, { contentId });
      throw new AppError(
        "Failed to fetch summary",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return data;
  }

  async createSummary(input: CreateSummaryInput): Promise<SummaryRecord> {
    const { data, error } = await supabase
      .from('summaries')
      .insert([input])
      .select()
      .single();

    if (error) {
      this.logger.error("Error creating summary:", error, { input });
      throw new AppError(
        "Failed to create summary",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return data;
  }

  // Tag methods
  async findOrCreateTag(input: CreateTagInput): Promise<TagRecord> {
    try {
      // First try to find the tag
      const { data: existingTag, error: findError } = await supabase
        .from('tags')
        .select('*')
        .eq('name', input.name)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (existingTag) {
        return existingTag;
      }

      // If tag doesn't exist, create it
      const { data: newTag, error: createError } = await supabase
        .from('tags')
        .insert([input])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newTag;
    } catch (error) {
      logger.error('Error in findOrCreateTag:', error as Error | PostgrestError, { tagName: input.name });
      throw new AppError(
        'Failed to find or create tag',
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR,
      );
    }
  }

  async addContentTag(contentTag: ContentTagRecord): Promise<void> {
    const { error } = await supabase
      .from('content_tags')
      .insert(contentTag)
      .select();

    if (error) {
      this.logger.error("Error adding content tag:", error, { contentTag });
      throw new AppError(
        "Failed to add content tag",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }
  }

  async getContentTags(contentId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase
      .from('content_tags')
      .select('*')
      .eq('content_id', contentId);

    if (error) {
      this.logger.error("Error fetching content tags:", error, { contentId });
      throw new AppError(
        "Failed to fetch content tags",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    const tags = await Promise.all(data.map(async ct => {
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .eq('id', ct.tag_id)
        .single();

      if (tagError) {
        this.logger.error("Error fetching tag:", tagError, { tagId: ct.tag_id });
        throw new AppError(
          "Failed to fetch tag",
          ErrorCode.DATABASE_ERROR,
          HttpStatus.INTERNAL_ERROR
        );
      }

      return tagData;
    }));

    return tags;
  }

  async addContentTags(contentId: string, tagIds: string[]): Promise<void> {
    try {
      const contentTags = tagIds.map(tagId => ({
        content_id: contentId,
        tag_id: tagId,
      }));

      const { error } = await supabase.from('content_tags').insert(contentTags);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error in addContentTags:', error as Error | PostgrestError, { contentId, tagIds });
      throw new AppError(
        'Failed to add content tags',
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR,
      );
    }
  }

  // Content Methods
  async findContentById(id: string): Promise<ContentWithRelations | null> {
    const { data, error } = await supabase
      .from('content')
      .select('*, channel:channels(*)')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error("Error fetching content:", error, { id });
      return null;
    }

    return data;
  }

  async findOrCreateContent(input: CreateContentInput): Promise<ContentWithRelations> {
    try {
      // First try to find the content
      const { data: existingContent, error: findError } = await supabase
        .from('content')
        .select('*, channel:channels(*)')
        .eq('id', input.id)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (existingContent) {
        return existingContent;
      }

      // If content doesn't exist, create it
      const { data: newContent, error: createError } = await supabase
        .from('content')
        .insert([{
          id: input.id,
          content_type: input.content_type,
          unique_identifier: input.unique_identifier,
          title: input.title,
          url: input.url,
          transcript: input.transcript,
          published_at: input.published_at,
          source_id: input.source_id,
        }])
        .select('*, channel:channels(*)')
        .single();

      if (createError) {
        throw createError;
      }

      return newContent;
    } catch (error) {
      logger.error('Error in findOrCreateContent:', error as Error | PostgrestError, { contentId: input.id });
      throw new AppError(
        'Failed to find or create content',
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR,
      );
    }
  }

  async createContent(content: CreateContentInput): Promise<ContentWithRelations> {
    const { data, error } = await supabase
      .from('content')
      .insert(content)
      .select('*, channel:channels(*)')
      .single();

    if (error) {
      this.logger.error("Error creating content:", error, { content });
      throw new AppError(
        "Failed to create content",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return data;
  }

  async updateContent(id: string, updates: Partial<ContentRecord>): Promise<ContentWithRelations> {
    const { data, error } = await supabase
      .from('content')
      .update(updates)
      .eq('id', id)
      .select('*, channel:channels(*)')
      .single();

    if (error) {
      this.logger.error("Error updating content:", error, { id, updates });
      throw new AppError(
        "Failed to update content",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return data;
  }
}