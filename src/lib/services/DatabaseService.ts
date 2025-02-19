import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";
import {
  VideoRecord,
  UserSummaryRecord,
  ChannelRecord,
  ProfileRecord,
  TagRecord,
  ContentTagRecord,
  SubscriptionRecord
} from '@/lib/types/database';
import { supabase } from "@/lib/utils/supabaseClient";

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
    } catch (err) {
      if (err instanceof AppError) throw err;
      this.logger.error("Unexpected error in getProfile:", err, { userId });
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
    } catch (err) {
      if (err instanceof AppError) throw err;
      this.logger.error("Unexpected error in upsertProfile:", err, { profile });
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

  // Video methods
  async findVideoById(id: string): Promise<VideoRecord | null> {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error("Error fetching video:", error, { id });
      return null;
    }

    const channel = await this.findChannelById(data.channel_id);
    return {
      ...data,
      channel
    };
  }

  async createVideo(video: Omit<VideoRecord, 'created_at'>): Promise<VideoRecord> {
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

    const channel = await this.findChannelById(video.channel_id);
    return {
      ...data,
      channel
    };
  }

  async updateVideo(id: string, video: Partial<VideoRecord>): Promise<VideoRecord> {
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

    const channel = await this.findChannelById(data.channel_id);
    return {
      ...data,
      channel
    };
  }

  // Summary methods
  async getUserSummaries(userId: string): Promise<UserSummaryRecord[]> {
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

  async createUserSummary(summary: Omit<UserSummaryRecord, 'id' | 'created_at' | 'updated_at'>): Promise<UserSummaryRecord> {
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

  async updateUserSummary(id: string, summary: Partial<UserSummaryRecord>): Promise<UserSummaryRecord> {
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

  async findSummaryByVideoId(videoId: string, userId: string): Promise<UserSummaryRecord | null> {
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

  // Tag methods
  async findOrCreateTag(name: string): Promise<TagRecord> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      this.logger.error("Error fetching tag:", error, { name });
      throw new AppError(
        "Failed to fetch tag",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    if (data) return data;

    const { data: newTagData, error: newTagError } = await supabase
      .from('tags')
      .insert({ name })
      .select()
      .single();

    if (newTagError) {
      this.logger.error("Error creating tag:", newTagError, { name });
      throw new AppError(
        "Failed to create tag",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return newTagData;
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

  // Subscription methods
  async getSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      this.logger.error("Error fetching subscriptions:", error, { userId });
      throw new AppError(
        "Failed to fetch subscriptions",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return data;
  }

  async addSubscription(subscription: Omit<SubscriptionRecord, 'id' | 'created_at'>): Promise<SubscriptionRecord> {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) {
      this.logger.error("Error adding subscription:", error, { subscription });
      throw new AppError(
        "Failed to add subscription",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return data;
  }

  async removeSubscription(userId: string, subscriptionId: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error("Error removing subscription:", error, { userId, subscriptionId });
      throw new AppError(
        "Failed to remove subscription",
        ErrorCode.DATABASE_ERROR,
        HttpStatus.INTERNAL_ERROR
      );
    }
  }
}