import { NextRequest, NextResponse } from "next/server";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";

// Request validation schema
const updateSummarySchema = z.object({
  videoId: z.string(),
  detailed_summary: z.string(),
});

/**
 * Update a video summary
 * PUT /api/videos/summaries/update
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const routeLogger = logger.withContext({ route: 'api/videos/summaries/update' });

  try {
    const body = await req.json();
    const result = updateSummarySchema.safeParse(body);

    if (!result.success) {
      throw new AppError(
        "Invalid request data",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST,
        { details: result.error.format() }
      );
    }

    const { videoId, detailed_summary } = result.data;

    // Get the summary for this video
    const db = new DatabaseService('Summaries');
    const summary = await db.findSummaryByVideoId(videoId, 'anonymous');

    if (!summary) {
      throw new AppError(
        "Summary not found",
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }

    // Update the summary
    const updatedSummary = await db.updateSummary(summary.id, {
      detailed_summary,
    });

    return NextResponse.json({ data: updatedSummary });
  } catch (error) {
    if (error instanceof AppError) {
      routeLogger.error('Application error while updating summary', error);
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    routeLogger.error('Unexpected error while updating summary', error as Error);
    const appError = new AppError(
      "Failed to update summary",
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