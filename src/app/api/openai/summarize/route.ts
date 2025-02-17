import { NextRequest, NextResponse } from "next/server";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { OpenAIService } from "@/lib/services/openai";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";

// Initialize OpenAI service
const openaiService = new OpenAIService();

// Request validation schema
const requestSchema = z.object({
  text: z.string().min(1),
  options: z.object({
    maxLength: z.number().min(1).max(4000).optional(),
    format: z.enum(["paragraph", "bullets"]).optional(),
  }).optional(),
});

/**
 * Generate detailed summary using OpenAI
 * POST /api/openai/summarize
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const routeLogger = logger.withContext({ route: 'api/openai/summarize' });

  try {
    routeLogger.info('Generating detailed summary');
    const body = await req.json();
    
    routeLogger.info('Validating request body', { body });
    const result = requestSchema.safeParse(body);
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

    const { text, options = {} } = result.data;

    // Generate detailed summary using OpenAI
    const response = await openaiService.generateChatCompletion([
      {
        role: "system",
        content: "You are a helpful assistant that creates detailed summaries. Include important details, examples, and explanations while maintaining clarity. Structure your response with clear sections and bullet points where appropriate."
      },
      {
        role: "user",
        content: `Please create a detailed summary of this text, including key points, examples, and explanations. Format the response with clear sections and bullet points where appropriate:\n\n${text}`
      }
    ], {
      temperature: 0.7,
      max_tokens: options.maxLength || 2000,
    });

    const summary = response.choices[0].message.content;
    routeLogger.info('Successfully generated detailed summary');

    return NextResponse.json({ data: { summary } });
  } catch (error) {
    if (error instanceof AppError) {
      routeLogger.error('Application error while generating summary', error);
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }
    
    routeLogger.error('Unexpected error while generating summary', error as Error);
    const appError = new AppError(
      "Failed to generate summary",
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
