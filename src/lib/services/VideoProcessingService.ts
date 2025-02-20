import { StoredTranscript } from "@/lib/types/storage";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import {
  getTranscript,
  storeTranscript
} from "@/lib/utils/storage";
import { extractVideoInfo } from "@/lib/utils/youtube";
import { VideoProcessingOptions } from "@/lib/types/storage";
import { DatabaseService } from "./DatabaseService";
import { OpenAIService } from "./openai";
import { UserSummaryRecord, VideoRecord } from "@/lib/types/database";

/**
 * Service class for handling video processing and transcript management
 */
export class VideoProcessingService extends DatabaseService {
  private openAIService: OpenAIService;

  constructor() {
    super("VideoProcessingService");
    this.openAIService = new OpenAIService();
  }

  /**
   * Find a video record by ID
   */
  async findVideoRecord(videoId: string): Promise<VideoRecord | null> {
    return this.findVideoById(videoId);
  }

  /**
   * Create a new video record
   */
  async createVideoRecord(videoId: string, url: string, transcript: StoredTranscript): Promise<VideoRecord> {
    const video: Omit<VideoRecord, 'created_at'> = {
      id: videoId,
      channel_id: 'anonymous', // Use anonymous channel since we removed auth
      unique_identifier: videoId,
      title: 'Unknown', // This should be fetched from YouTube API
      url,
      transcript_path: `transcripts/${videoId}.json`,
      language: transcript.language,
      metadata: null,
      published_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    return this.createVideo(video);
  }

  /**
   * Generate transcript for a video
   */
  private async generateTranscript(url: string, language?: string): Promise<StoredTranscript> {
    this.logger.info("Generating transcript", { url, language });

    try {
      const videoInfo = extractVideoInfo(url);
      if (!videoInfo.videoId) {
        throw new AppError(
          "Invalid YouTube URL",
          ErrorCode.VALIDATION_INVALID_FORMAT,
          HttpStatus.BAD_REQUEST
        );
      }

      // Process video using OpenAI service
      const result = await this.openAIService.processYouTubeVideo(url);

      // Create transcript object
      const transcript: StoredTranscript = {
        video_id: videoInfo.videoId,
        language: language || "en",
        segments: [
          {
            text: result.transcript,
            start: 0,
            end: 1,
          }
        ],
        metadata: {
          title: "Unknown",
          channel: "Unknown",
          duration: 0,
          last_updated: new Date(),
        }
      };

      await storeTranscript(videoInfo.videoId, transcript);
      this.logger.info("Generated and stored transcript", { videoId: videoInfo.videoId });

      return transcript;
    } catch (error) {
      this.logger.error("Failed to generate transcript", error as Error);
      throw error;
    }
  }

  /**
   * Process a video URL
   */
  async processVideo(url: string, userId: string, options: VideoProcessingOptions = {}): Promise<UserSummaryRecord> {
    this.logger.info("Processing video", { url, userId, options });

    try {
      const videoId = extractVideoInfo(url).videoId;
      if (!videoId) {
        throw new AppError(
          "Invalid YouTube URL",
          ErrorCode.VALIDATION_INVALID_FORMAT,
          HttpStatus.BAD_REQUEST
        );
      }

      // Check if video exists
      let video = await this.findVideoRecord(videoId);
      let transcript: StoredTranscript;

      // Generate new transcript if video doesn't exist
      if (!video) {
        transcript = await this.generateTranscript(url, options.language);
        video = await this.createVideoRecord(videoId, url, transcript);
      } else {
        // Get existing transcript
        const existingTranscript = await getTranscript(videoId);
        if (!existingTranscript) {
          throw new AppError(
            "Transcript not found",
            ErrorCode.STORAGE_FILE_NOT_FOUND,
            HttpStatus.NOT_FOUND
          );
        }
        transcript = existingTranscript;
      }

      // Process video using OpenAI service
      const result = await this.openAIService.processYouTubeVideo(url);

      // Create user summary
      const userSummary = await this.createUserSummary({
        user_id: userId,
        video_id: videoId,
        summary: result.summary,
        detailed_summary: null, // Will be generated on demand
        tags: result.tags,
      });

      this.logger.info("Processed video successfully", {
        videoId,
        summaryId: userSummary.id
      });

      return userSummary;
    } catch (error) {
      this.logger.error("Failed to process video", error as Error);
      throw error;
    }
  }
}