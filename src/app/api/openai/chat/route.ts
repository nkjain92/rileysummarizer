import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { OpenAIService } from "@/lib/services/openai";

// Initialize OpenAI service
const openaiService = new OpenAIService();

// Request validation schema
const validateRequest = (body: any) => {
  if (!body.messages || !Array.isArray(body.messages)) {
    throw new AppError(
      "Messages array is required",
      ErrorCode.VALIDATION_INVALID_FORMAT,
      HttpStatus.BAD_REQUEST
    );
  }

  for (const message of body.messages) {
    if (!message.role || !message.content) {
      throw new AppError(
        "Each message must have a role and content",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (!["system", "user", "assistant", "function"].includes(message.role)) {
      throw new AppError(
        "Invalid message role",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  return body as {
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    options?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>;
  };
};

/**
 * Handle chat completion request
 * POST /api/openai/chat
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { messages, options } = validateRequest(body);

    const response = await openaiService.generateChatCompletion(messages, options);

    return NextResponse.json({ data: response });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    const appError = new AppError(
      "Failed to generate chat completion",
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
