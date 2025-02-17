import { NextRequest, NextResponse } from "next/server";
import { OpenAIService } from "@/lib/services/openai";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";
import { DatabaseService } from "@/lib/services/DatabaseService";

// Request validation schema
const processVideoSchema = z.object({
  url: z.string().url(),
  detailed_summary: z.string().optional(),
});

/**
 * Process a video URL
 * POST /api/videos/process
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const routeLogger = logger.withContext({ route: 'api/videos/process' });
  
  try {
    routeLogger.info('Processing video request');
    const body = await req.json();
    
    routeLogger.info('Validating request body', { body });
    const result = processVideoSchema.safeParse(body);
    if (!result.success) {
      routeLogger.warn('Invalid request data', { 
        errors: result.error.format() 
      });
      throw new AppError(
        "Invalid request data",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST,
        { details: result.error.format() }
      );
    }

    // Process video using OpenAI service
    routeLogger.info('Processing video', { url: result.data.url });
    const openai = new OpenAIService();
    const videoSummary = await openai.processYouTubeVideo(result.data.url);

    // Get video metadata from YouTube oEmbed
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(result.data.url)}&format=json`
    );
    if (!oembedResponse.ok) {
      throw new AppError(
        "Failed to fetch video metadata",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }
    const videoData = await oembedResponse.json();

    // Store the summary in the database
    const db = new DatabaseService('VideoProcessing');
    
    // Create or update channel
    const channelId = videoSummary.channelId || 'anonymous';
    await db.upsertChannel({
      id: channelId,
      name: videoData.author_name || 'Unknown Channel',
      url: videoData.author_url || '',
      subscriber_count: 0,
    });

    // Create video record if it doesn't exist
    const existingVideo = await db.findVideoById(videoSummary.videoId);
    if (!existingVideo) {
      await db.createVideo({
        id: videoSummary.videoId,
        channel_id: channelId,
        unique_identifier: videoSummary.videoId,
        title: videoData.title || 'Unknown',
        url: result.data.url,
        transcript_path: `transcripts/${videoSummary.videoId}.json`,
        language: 'en',
        metadata: {
          author_name: videoData.author_name,
          author_url: videoData.author_url,
          thumbnail_url: videoData.thumbnail_url
        },
        published_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      });
    }

    // Create the summary
    const summary = await db.createUserSummary({
      user_id: 'anonymous',
      video_id: videoSummary.videoId,
      summary: videoSummary.summary,
      detailed_summary: result.data.detailed_summary || videoSummary.detailed_summary,
      tags: videoSummary.tags,
    });

    routeLogger.info('Video processed successfully', { 
      summaryId: summary.id,
      videoId: videoSummary.videoId 
    });

    return NextResponse.json({ data: summary });
  } catch (error) {
    if (error instanceof AppError) {
      routeLogger.error('Application error while processing video', error);
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }
    
    routeLogger.error('Unexpected error while processing video', error as Error);
    const appError = new AppError(
      "Failed to process video",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
    return NextResponse.json(
      { error: appError.toResponse() },
      { status: appError.statusCode }
    );
  }
} 