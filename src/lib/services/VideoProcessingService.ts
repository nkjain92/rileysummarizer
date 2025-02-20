import { StoredTranscript } from "@/lib/types/storage";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { storeTranscript } from "@/lib/utils/storage";
import { extractVideoInfo } from "@/lib/utils/youtube";
import { VideoProcessingOptions } from "@/lib/types/storage";
import { DatabaseService } from "./DatabaseService";
import { OpenAIService } from "./openai";
import { UserSummaryRecord, VideoRecord } from "@/lib/types/database";

/**
 * Service class for handling video processing and summary generation
 */
export class VideoProcessingService extends DatabaseService {
  private openAIService: OpenAIService;

  constructor() {
    super("VideoProcessingService");
    this.openAIService = new OpenAIService();
  }

  /**
   * Process a video URL and generate summary
   */
  async processVideo(url: string, userId: string, options: VideoProcessingOptions = {}): Promise<UserSummaryRecord> {
    this.logger.info("Processing video", { url, userId });

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
        language: options.language || "en",
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

      // Store transcript
      await storeTranscript(videoInfo.videoId, transcript);

      // Create video record
      const video: Omit<VideoRecord, 'created_at'> = {
        id: videoInfo.videoId,
        channel_id: 'anonymous',
        unique_identifier: videoInfo.videoId,
        title: 'Unknown',
        url,
        transcript_path: `transcripts/${videoInfo.videoId}.json`,
        language: transcript.language,
        metadata: null,
        published_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      await this.createVideo(video);

      // Create user summary
      const userSummary = await this.createUserSummary({
        user_id: userId,
        video_id: videoInfo.videoId,
        summary: result.summary,
        detailed_summary: null,
        tags: result.tags,
      });

      this.logger.info("Processed video successfully", {
        videoId: videoInfo.videoId,
        summaryId: userSummary.id
      });

      return userSummary;
    } catch (error) {
      this.logger.error("Failed to process video", error as Error);
      throw error;
    }
  }
}