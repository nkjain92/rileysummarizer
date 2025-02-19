import { NextRequest } from 'next/server';
import { OpenAIService } from '@/lib/services/openai';
import { DatabaseService } from '@/lib/services/DatabaseService';
import { extractVideoInfo } from '@/lib/utils/youtube';
import { AppError, ErrorCode, HttpStatus } from '@/lib/types/errors';
import { logger } from '@/lib/utils/logger';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Log auth header
    const authHeader = req.headers.get('authorization');
    logger.info('Auth header received:', { authHeader: authHeader?.substring(0, 20) + '...' });

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing auth token', ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Get cookie store
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    logger.info('Cookies received:', {
      cookieCount: allCookies.length,
      cookieNames: allCookies.map(c => c.name)
    });

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get session using the token
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    // Log session details
    logger.info('Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasError: !!sessionError,
      errorMessage: sessionError?.message,
      tokenMatch: session?.access_token === token
    });

    if (sessionError) {
      logger.error('Session error:', sessionError);
      throw new AppError('Session error', ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    if (!session?.user) {
      logger.error('No user in session');
      throw new AppError('Invalid session', ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    if (session.access_token !== token) {
      logger.error('Token mismatch');
      throw new AppError('Invalid token', ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    // Parse request body
    const body = await req.json();
    const { url } = body;

    if (!url) {
      throw new AppError('URL is required', ErrorCode.INVALID_INPUT, HttpStatus.BAD_REQUEST);
    }

    // Extract video info
    const videoInfo = extractVideoInfo(url);
    if (!videoInfo.videoId || !videoInfo.channelId) {
      throw new AppError('Invalid YouTube URL', ErrorCode.INVALID_INPUT, HttpStatus.BAD_REQUEST);
    }

    // Initialize services
    const openai = new OpenAIService();
    const db = new DatabaseService('video-process');

    // Find or create channel
    const channel = await db.findOrCreateChannel({
      id: videoInfo.channelId,
      name: 'Unknown Channel', // This will be updated when we fetch video metadata
      url: `https://youtube.com/channel/${videoInfo.channelId}`,
      subscriber_count: 0
    });

    // Find or create content
    const content = await db.findOrCreateContent({
      id: videoInfo.videoId,
      content_type: 'video',
      unique_identifier: videoInfo.videoId,
      title: 'Loading...', // This will be updated when we fetch video metadata
      url: url,
      transcript: '', // This will be updated when we process the video
      published_at: new Date().toISOString(), // This will be updated when we fetch video metadata
      source_id: channel.id,
      search_vector: null
    });

    // Check if we already have a summary
    const existingSummary = await db.findSummaryByContentId(content.id);
    if (existingSummary) {
      // Create user summary history
      await db.createUserSummaryHistory(session.user.id, content.id, existingSummary.id);
      return Response.json({ data: existingSummary });
    }

    // Process video with OpenAI
    const processedVideo = await openai.processYouTubeVideo(url);

    // Update content with transcript and metadata
    await db.updateContent(content.id, {
      title: processedVideo.title,
      transcript: processedVideo.transcript,
    });

    // Create summary
    const summary = await db.createSummary({
      content_id: content.id,
      summary: processedVideo.summary,
      summary_type: 'short',
    });

    // Create tags
    const tagPromises = processedVideo.tags.map(tagName =>
      db.findOrCreateTag({
        name: tagName,
      }),
    );
    const tags = await Promise.all(tagPromises);

    // Add content tags
    await db.addContentTags(
      content.id,
      tags.map(tag => tag.id),
    );

    // Create user summary history
    await db.createUserSummaryHistory(session.user.id, content.id, summary.id);

    // Return the response
    return Response.json({
      data: {
        ...summary,
        content: {
          ...content,
          channel,
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