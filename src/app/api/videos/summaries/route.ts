import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

/**
 * Get user's video summaries
 * GET /api/videos/summaries
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const routeLogger = logger.withContext({ route: 'api/videos/summaries' });

  try {
    routeLogger.info('Fetching user summaries');
    const db = new DatabaseService('Summaries');
    const summaries = await db.getUserSummaries('anonymous');
    const videos = await Promise.all(
      summaries.map(async (summary) => {
        const video = await db.findVideoById(summary.video_id);
        return {
          ...summary,
          videos: {
            title: video?.title || 'Unknown Title',
            url: video?.url || '',
            channel: { name: 'Anonymous Channel' }
          },
          created_at: summary.created_at || new Date().toISOString()
        };
      })
    );

    routeLogger.info('Successfully fetched summaries', { 
      count: videos.length 
    });

    return NextResponse.json({ data: videos });
  } catch (error) {
    if (error instanceof AppError) {
      routeLogger.error('Application error while fetching summaries', error);
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }
    
    routeLogger.error('Unexpected error while fetching summaries', error as Error);
    const appError = new AppError(
      "Failed to fetch summaries",
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