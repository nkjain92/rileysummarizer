import { NextRequest, NextResponse } from "next/server";
import { VideoProcessingService } from "@/lib/services/VideoProcessingService";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { z } from "zod";

// Request validation schema
const refreshVideoSchema = z.object({
  videoId: z.string(),
});

/**
 * Refresh a video's transcript and summary
 * PUT /api/videos/refresh
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    
    const result = refreshVideoSchema.safeParse(body);
    if (!result.success) {
      throw new AppError(
        "Invalid request data",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST,
        { details: result.error.format() }
      );
    }

    const service = new VideoProcessingService();
    const summary = await service.refreshVideo(result.data.videoId, 'anonymous');

    return NextResponse.json({ data: summary });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }
    
    const appError = new AppError(
      "Failed to refresh video",
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