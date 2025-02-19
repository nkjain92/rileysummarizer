import { NextRequest } from 'next/server';
import { OpenAIService } from '@/lib/services/openai';
import { DatabaseService } from '@/lib/services/DatabaseService';
import { extractVideoInfo, fetchTranscript } from '@/lib/utils/youtube';
import { AppError, ErrorCode, HttpStatus } from '@/lib/types/errors';
import { logger } from '@/lib/utils/logger';
import { createServerSupabaseClient } from '@/lib/utils/supabaseServer';
import { TagRecord } from '@/lib/types/database';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing auth token', ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    // Create Supabase client
    const supabase = createServerSupabaseClient();

    // Get authenticated user using getUser() for security
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.split(' ')[1]);

    if (userError || !user) {
      throw new AppError(
        userError?.message || 'Invalid session',
        ErrorCode.UNAUTHORIZED,
        HttpStatus.UNAUTHORIZED
      );
    }

    // Parse request body
    const body = await req.json();
    const { url } = body;

    if (!url) {
      throw new AppError('URL is required', ErrorCode.INVALID_INPUT, HttpStatus.BAD_REQUEST);
    }

    // Extract video info and fetch transcript
    const videoInfo = await extractVideoInfo(url);
    const transcript = await fetchTranscript(videoInfo.videoId);

    // Initialize services
    const openai = new OpenAIService();
    const db = new DatabaseService('video-process');

    // Create or get anonymous channel
    const anonymousChannel = await db.findOrCreateChannel({
      id: 'anonymous',
      name: 'Anonymous',
      url: 'https://example.com',
      subscriber_count: 0
    });

    // Find or create content
    const content = await db.createContent({
      id: videoInfo.videoId,
      content_type: 'video',
      unique_identifier: videoInfo.videoId,
      title: videoInfo.title,
      url: url,
      transcript: transcript,
      published_at: new Date().toISOString(),
      source_id: 'anonymous',
      search_vector: null
    });

    // Check if we already have a summary
    const existingSummary = await db.findSummaryByContentId(content.id);
    if (existingSummary) {
      // Create user summary history
      await db.createUserSummaryHistory(user.id, content.id, existingSummary.id);
      return Response.json({ data: existingSummary });
    }

    // Process video with OpenAI
    const processedVideo = await openai.processYouTubeVideo(url);

    // Create summary (brief version)
    const summary = await db.createSummary({
      content_id: content.id,
      summary: processedVideo.summary,
      summary_type: 'short'
    });

    // Create tags
    const tagPromises = processedVideo.tags.map(tagName =>
      db.findOrCreateTag({
        name: tagName,
      })
    );
    const tags: TagRecord[] = await Promise.all(tagPromises);

    // Add content tags
    await db.addContentTags(
      content.id,
      tags.map(tag => tag.id)
    );

    // Create user summary history
    await db.createUserSummaryHistory(user.id, content.id, summary.id);

    // Return the response
    return Response.json({
      data: {
        ...summary,
        content: {
          ...content,
        },
        tags: tags.map(tag => tag.name),
      },
    });
  } catch (error) {
    logger.error('Error processing video:', error as Error);

    if (error instanceof AppError) {
      return Response.json(
        { error: { message: error.message, code: error.code } },
        { status: error.statusCode },
      );
    }

    return Response.json(
      {
        error: {
          message: 'An unexpected error occurred',
          code: ErrorCode.UNKNOWN_ERROR,
        },
      },
      { status: HttpStatus.INTERNAL_ERROR },
    );
  }
}