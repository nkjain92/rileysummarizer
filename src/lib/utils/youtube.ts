import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

interface TranscriptSegment {
  text: string;
  offset: string;
  duration: number;
  lang?: string;
}

interface VideoInfo {
  videoId: string;
  title: string;
}

/**
 * Extract video ID from YouTube URL and fetch metadata
 */
export async function extractVideoInfo(url: string): Promise<VideoInfo> {
  try {
    logger.info("Extracting video info from URL:", { url });
    const urlObj = new URL(url);
    let videoId: string | null = null;

    // Validate YouTube domain
    const isYouTubeDomain = urlObj.hostname === "youtube.com" ||
                           urlObj.hostname === "www.youtube.com" ||
                           urlObj.hostname === "youtu.be";

    logger.info("URL validation:", {
      hostname: urlObj.hostname,
      isYouTubeDomain,
      pathname: urlObj.pathname,
      searchParams: Object.fromEntries(urlObj.searchParams)
    });

    if (!isYouTubeDomain) {
      throw new AppError(
        "Invalid YouTube URL: Not a YouTube domain",
        ErrorCode.VIDEO_INVALID_URL,
        HttpStatus.BAD_REQUEST
      );
    }

    // Handle different YouTube URL formats
    if (urlObj.hostname.includes("youtube.com")) {
      // Regular watch URLs
      if (urlObj.pathname === "/watch") {
        videoId = urlObj.searchParams.get("v");
        if (!videoId) {
          throw new AppError(
            "Invalid YouTube URL: Missing video ID",
            ErrorCode.VIDEO_INVALID_URL,
            HttpStatus.BAD_REQUEST
          );
        }
      }
      // Shorts URLs
      else if (urlObj.pathname.startsWith("/shorts/")) {
        videoId = urlObj.pathname.split("/")[2];
      }
      // Live URLs
      else if (urlObj.pathname.startsWith("/live/")) {
        videoId = urlObj.pathname.split("/")[2];
      }
    }
    // Handle youtu.be URLs
    else if (urlObj.hostname === "youtu.be") {
      videoId = urlObj.pathname.slice(1);
    }

    logger.info("Extracted video ID:", { videoId });

    // Validate video ID format
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new AppError(
        "Invalid YouTube URL: Invalid video ID format",
        ErrorCode.VIDEO_INVALID_URL,
        HttpStatus.BAD_REQUEST
      );
    }

    // Fetch video metadata from oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      logger.error("Failed to fetch video metadata:", { url, status: response.status });
      // Return basic info if oEmbed fails
      return {
        videoId,
        title: `YouTube Video ${videoId}`,
      };
    }

    const metadata = await response.json();
    return {
      videoId,
      title: metadata.title || `YouTube Video ${videoId}`,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    logger.error("Error extracting video info:", error);
    throw new AppError(
      "Invalid YouTube URL: " + (error instanceof Error ? error.message : "Unknown error"),
      ErrorCode.VIDEO_INVALID_URL,
      HttpStatus.BAD_REQUEST
    );
  }
}

/**
 * Fetch transcript from RapidAPI
 */
export async function fetchTranscript(videoId: string): Promise<string> {
  try {
    logger.info("Fetching transcript for video:", { videoId });

    const response = await fetch(
      `https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${videoId}`,
      {
        headers: {
          "x-rapidapi-host": "youtube-transcript3.p.rapidapi.com",
          "x-rapidapi-key": "5230d7b76fmsheb407ac6cb96efap1c703cjsnd3f8f5715b27",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error("Transcript API error:", { videoId, status: response.status, error: errorData });

      if (response.status === 404) {
        throw new AppError(
          "No transcript available for this video",
          ErrorCode.VIDEO_NOT_FOUND,
          HttpStatus.NOT_FOUND
        );
      }

      if (response.status === 429) {
        throw new AppError(
          "Rate limit exceeded for transcript service",
          ErrorCode.AI_RATE_LIMIT,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      throw new AppError(
        errorData.message || "Failed to fetch transcript",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        response.status
      );
    }

    const data = await response.json();
    logger.info("Successfully fetched transcript", { videoId });

    // Check for the specific RapidAPI response format
    if (!data || !data.transcript || !Array.isArray(data.transcript)) {
      throw new AppError(
        "Invalid transcript format received",
        ErrorCode.AI_INVALID_RESPONSE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    // Combine all transcript segments into a single text
    const segments = data.transcript as TranscriptSegment[];
    if (segments.length === 0) {
      throw new AppError(
        "No transcript content available",
        ErrorCode.VIDEO_NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }

    return segments
      .sort((a, b) => parseFloat(a.offset) - parseFloat(b.offset)) // Sort by offset
      .map(segment => segment.text)
      .join(" ");
  } catch (error) {
    logger.error("Error fetching transcript:", error);
    throw error;
  }
}