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
   * Update a video record
   */
  async updateVideoRecord(videoId: string, transcript: StoredTranscript): Promise<VideoRecord> {
    const update = {
      last_updated: new Date().toISOString(),
      language: transcript.language,
    };

    return this.updateVideo(videoId, update);
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

      // For now, just create a simple transcript with the video URL
      const transcript: StoredTranscript = {
        video_id: videoInfo.videoId,
        language: language || "en",
        segments: [
          {
            text: `This is a placeholder transcript for video ${videoInfo.videoId}. Transcription service is currently not implemented.`,
            start: 0,
            end: 1,
          }
        ],
        metadata: {
          title: "Placeholder Title",
          channel: "Placeholder Channel",
          duration: 1,
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
   * Generate summary for a transcript using OpenAI
   */
  private async generateSummary(transcript: StoredTranscript): Promise<string> {
    this.logger.info("Generating summary", { videoId: transcript.video_id });
    
    try {
      const text = transcript.segments.map(s => s.text).join(" ");
      const result = await this.openAIService.processYouTubeVideo(`https://youtube.com/watch?v=${transcript.video_id}`);
      return result.summary;
    } catch (error) {
      this.logger.error("Failed to generate summary", error as Error);
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

      if (!video || options.refresh) {
        // Generate new transcript
        transcript = await this.generateTranscript(url, options.language);
        
        if (!video) {
          // Create new video record
          video = await this.createVideoRecord(videoId, url, transcript);
        } else {
          // Update existing video record
          video = await this.updateVideoRecord(videoId, transcript);
        }
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

      // Generate summary if requested
      let summary = "";
      if (options.generateSummary !== false) {
        summary = await this.generateSummary(transcript);
      }

      // Create user summary
      const userSummary = await this.createUserSummary({
        user_id: userId,
        video_id: videoId,
        summary,
        detailed_summary: null,
        tags: [],
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

  /**
   * Refresh a video's transcript and summary
   */
  async refreshVideo(videoId: string, userId: string): Promise<UserSummaryRecord> {
    this.logger.info("Refreshing video", { videoId, userId });
    
    try {
      const video = await this.findVideoRecord(videoId);
      if (!video) {
        throw new AppError(
          "Video not found",
          ErrorCode.STORAGE_FILE_NOT_FOUND,
          HttpStatus.NOT_FOUND
        );
      }

      // Process video with refresh option
      return this.processVideo(video.url, userId, { refresh: true });
    } catch (error) {
      this.logger.error("Failed to refresh video", error as Error);
      throw error;
    }
  }
} 