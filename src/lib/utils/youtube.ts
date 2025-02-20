import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";

interface TranscriptSegment {
  text: string;
  offset: string;
  duration: number;
  lang?: string;
}

interface VideoInfo {
  videoId: string | null;
  channelId: string | null;
}

/**
 * Extract video ID and channel info from YouTube URL
 */
export function extractVideoInfo(url: string): VideoInfo {
  try {
    const urlObj = new URL(url);
    let videoId = "";
    let channelId = urlObj.searchParams.get("ab_channel") || null;

    if (urlObj.hostname.includes("youtube.com")) {
      videoId = urlObj.searchParams.get("v") || "";
    } else if (urlObj.hostname === "youtu.be") {
      videoId = urlObj.pathname.slice(1);
    }

    return {
      videoId: videoId || null,
      channelId
    };
  } catch {
    return {
      videoId: null,
      channelId: null
    };
  }
}

/**
 * Fetch transcript from RapidAPI
 */
export async function fetchTranscript(videoId: string): Promise<string> {
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
        ErrorCode.API_RATE_LIMIT,
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
  
  // Check for the specific RapidAPI response format
  if (!data || !data.transcript || !Array.isArray(data.transcript)) {
    throw new AppError(
      "Invalid transcript format received",
      ErrorCode.API_INVALID_RESPONSE,
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
} 