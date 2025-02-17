import { NextRequest, NextResponse } from "next/server";
import { OpenAIService } from "@/lib/services/openai";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

/**
 * Transcribe audio using OpenAI Whisper
 * POST /api/openai/transcribe
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new AppError(
        "No file provided",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST
      );
    }

    const service = new OpenAIService();
    const transcript = await service.transcribeAudio(file);

    return NextResponse.json({ data: transcript });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    const appError = new AppError(
      "Failed to transcribe audio",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { error }
    );

    return NextResponse.json(
      { error: appError.toResponse() },
      { status: appError.statusCode }
    );
  }
}
