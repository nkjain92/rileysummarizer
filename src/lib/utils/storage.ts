import { StoredTranscript } from "@/lib/types/storage";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";

// In-memory storage for transcripts
const transcriptStore = new Map<string, StoredTranscript>();

/**
 * Store a transcript in memory
 */
export const storeTranscript = async (videoId: string, transcript: StoredTranscript): Promise<void> => {
  transcriptStore.set(videoId, transcript);
};

/**
 * Retrieve a transcript from memory
 */
export const getTranscript = async (videoId: string): Promise<StoredTranscript | null> => {
  return transcriptStore.get(videoId) || null;
};

/**
 * Check if a transcript exists in memory
 */
export const transcriptExists = async (videoId: string): Promise<boolean> => {
  return transcriptStore.has(videoId);
};