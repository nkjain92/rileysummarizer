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

// In-memory storage
const store = {
  videos: new Map<string, VideoRecord>(),
  channels: new Map<string, ChannelRecord>(),
  profiles: new Map<string, ProfileRecord>(),
  summaries: new Map<string, UserSummaryRecord>(),
  tags: new Map<string, TagRecord>(),
  contentTags: new Map<string, ContentTagRecord[]>(),
  subscriptions: new Map<string, SubscriptionRecord[]>()
};

/**
 * Base service class for database operations
 */
export class DatabaseService {
  protected logger;

  constructor(context: string) {
    this.logger = logger.withContext({ service: context });
  }

  // Profile methods
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    return store.profiles.get(userId) || null;
  }

  async upsertProfile(profile: Omit<ProfileRecord, 'created_at'>): Promise<ProfileRecord> {
    const now = new Date().toISOString();
    const fullProfile = {
      ...profile,
      created_at: now
    };
    store.profiles.set(profile.id, fullProfile);
    return fullProfile;
  }

  // Channel methods
  async findChannelById(id: string): Promise<ChannelRecord | null> {
    return store.channels.get(id) || null;
  }

  async upsertChannel(channel: Omit<ChannelRecord, 'created_at'>): Promise<ChannelRecord> {
    const now = new Date().toISOString();
    const fullChannel = {
      ...channel,
      created_at: now
    };
    store.channels.set(channel.id, fullChannel);
    return fullChannel;
  }

  // Video methods
  async findVideoById(id: string): Promise<VideoRecord | null> {
    const video = store.videos.get(id);
    if (!video) return null;
    
    const channel = store.channels.get(video.channel_id);
    return {
      ...video,
      channel
    };
  }

  async createVideo(video: Omit<VideoRecord, 'created_at'>): Promise<VideoRecord> {
    const now = new Date().toISOString();
    const fullVideo = {
      ...video,
      created_at: now,
      channels: {
        name: video.channel_id,
        url: '',
        subscriber_count: 0,
        created_at: now,
        id: video.channel_id
      }
    };
    store.videos.set(video.id, fullVideo);
    return fullVideo;
  }

  async updateVideo(id: string, video: Partial<VideoRecord>): Promise<VideoRecord> {
    const existing = store.videos.get(id);
    if (!existing) {
      throw new AppError(
        'Video not found',
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }

    const updated = {
      ...existing,
      ...video,
      id
    };
    store.videos.set(id, updated);
    return updated;
  }

  // Summary methods
  async getUserSummaries(userId: string): Promise<UserSummaryRecord[]> {
    const summaries = Array.from(store.summaries.values())
      .filter(s => s.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return Promise.all(summaries.map(async s => {
      const video = await this.findVideoById(s.video_id);
      return {
        ...s,
        videos: video
      };
    }));
  }

  async createUserSummary(summary: Omit<UserSummaryRecord, 'id' | 'created_at' | 'updated_at'>): Promise<UserSummaryRecord> {
    const now = new Date().toISOString();
    const id = Math.random().toString(36).substring(7);
    const video = store.videos.get(summary.video_id);
    
    const fullSummary = {
      ...summary,
      id,
      created_at: now,
      updated_at: now,
      videos: video
    };
    
    store.summaries.set(id, fullSummary);
    return fullSummary;
  }

  async updateUserSummary(id: string, summary: Partial<UserSummaryRecord>): Promise<UserSummaryRecord> {
    const existing = store.summaries.get(id);
    if (!existing) {
      throw new AppError(
        'Summary not found',
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }

    const updated = {
      ...existing,
      ...summary,
      id,
      updated_at: new Date().toISOString()
    };
    store.summaries.set(id, updated);
    return updated;
  }

  async findSummaryByVideoId(videoId: string, userId: string): Promise<UserSummaryRecord | null> {
    const summary = Array.from(store.summaries.values()).find(
      s => s.video_id === videoId && s.user_id === userId
    );
    
    if (!summary) return null;

    const video = await this.findVideoById(summary.video_id);
    return {
      ...summary,
      videos: video
    };
  }

  // Tag methods
  async findOrCreateTag(name: string): Promise<TagRecord> {
    const existingTag = Array.from(store.tags.values()).find(t => t.name === name);
    if (existingTag) return existingTag;

    const id = Math.random().toString(36).substring(7);
    const tag = {
      id,
      name,
      created_at: new Date().toISOString()
    };
    store.tags.set(id, tag);
    return tag;
  }

  async addContentTag(contentTag: ContentTagRecord): Promise<void> {
    const tags = store.contentTags.get(contentTag.content_id) || [];
    tags.push(contentTag);
    store.contentTags.set(contentTag.content_id, tags);
  }

  async getContentTags(contentId: string): Promise<TagRecord[]> {
    const contentTags = store.contentTags.get(contentId) || [];
    return Promise.all(contentTags.map(ct => store.tags.get(ct.tag_id)!));
  }

  // Subscription methods
  async getSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
    return store.subscriptions.get(userId) || [];
  }

  async addSubscription(subscription: Omit<SubscriptionRecord, 'id' | 'created_at'>): Promise<SubscriptionRecord> {
    const id = Math.random().toString(36).substring(7);
    const fullSubscription = {
      ...subscription,
      id,
      created_at: new Date().toISOString()
    };

    const userSubs = store.subscriptions.get(subscription.user_id) || [];
    userSubs.push(fullSubscription);
    store.subscriptions.set(subscription.user_id, userSubs);

    return fullSubscription;
  }

  async removeSubscription(userId: string, subscriptionId: string): Promise<void> {
    const userSubs = store.subscriptions.get(userId) || [];
    const filtered = userSubs.filter(s => s.id !== subscriptionId);
    store.subscriptions.set(userId, filtered);
  }
} 