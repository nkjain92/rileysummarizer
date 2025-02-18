/**
 * Interface representing a video record in the database
 */
export interface Video {
  id: string;
  url: string;
  transcript_path: string;
  last_updated: Date;
  language: string;
}

/**
 * Interface representing a user's summary of a video
 */
export interface UserSummary {
  id: string;
  user_id: string;
  video_id: string;
  summary: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface representing a transcript segment
 */
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Interface representing transcript metadata
 */
export interface TranscriptMetadata {
  title: string;
  channel: string;
  duration: number;
  last_updated: Date;
}

/**
 * Interface representing a stored transcript
 */
export interface StoredTranscript {
  video_id: string;
  language: string;
  segments: TranscriptSegment[];
  metadata: TranscriptMetadata;
}

/**
 * Options for video processing
 */
export interface VideoProcessingOptions {
  refresh?: boolean;
  language?: string;
  generateSummary?: boolean;
}

/**
 * Interface for database operation response
 */
export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

// In-memory storage for transcripts
export const transcriptStore = new Map<string, StoredTranscript>();

/**
 * Store a transcript in memory
 */
export const storeTranscript = async (videoId: string, transcript: StoredTranscript): Promise<void> => {
  transcriptStore.set(videoId, transcript);
};

/**
 * Get a transcript from memory
 */
export const getTranscript = async (videoId: string): Promise<StoredTranscript | null> => {
  return transcriptStore.get(videoId) || null;
};

/**
 * Delete a transcript from memory
 */
export const deleteTranscript = async (videoId: string): Promise<void> => {
  transcriptStore.delete(videoId);
};

/**
 * Check if a transcript exists in memory
 */
export const transcriptExists = async (videoId: string): Promise<boolean> => {
  return transcriptStore.has(videoId);
}; 