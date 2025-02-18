import { createClient } from "@supabase/supabase-js";
import { StoredTranscript } from "@/lib/types/storage";
import { 
  AppError, 
  ErrorCode, 
  createStorageError,
  HttpStatus 
} from "@/lib/types/errors";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a storage path for a video transcript
 */
export const getTranscriptPath = (videoId: string): string => 
  `transcripts/${videoId}.json`;

/**
 * Store a transcript in Supabase Storage
 */
export const storeTranscript = async (
  videoId: string,
  transcript: StoredTranscript
): Promise<void> => {
  try {
    const path = getTranscriptPath(videoId);
    const { error } = await supabase.storage
      .from("transcripts")
      .upload(path, JSON.stringify(transcript), {
        upsert: true,
        contentType: "application/json",
      });

    if (error) {
      throw createStorageError(
        "Failed to store transcript",
        ErrorCode.STORAGE_UPLOAD_FAILED,
        HttpStatus.INTERNAL_ERROR,
        { details: error }
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error storing transcript",
      ErrorCode.STORAGE_UPLOAD_FAILED,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
  }
};

/**
 * Retrieve a transcript from Supabase Storage
 */
export const getTranscript = async (
  videoId: string
): Promise<StoredTranscript | null> => {
  try {
    const path = getTranscriptPath(videoId);
    const { data, error } = await supabase.storage
      .from("transcripts")
      .download(path);

    if (error) {
      if (error.message.includes("404")) return null;
      throw createStorageError(
        "Failed to retrieve transcript",
        ErrorCode.STORAGE_DOWNLOAD_FAILED,
        HttpStatus.INTERNAL_ERROR,
        { details: error }
      );
    }

    if (!data) return null;
    return JSON.parse(await data.text()) as StoredTranscript;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error retrieving transcript",
      ErrorCode.STORAGE_DOWNLOAD_FAILED,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
  }
};

/**
 * Delete a transcript from Supabase Storage
 */
export const deleteTranscript = async (videoId: string): Promise<void> => {
  try {
    const path = getTranscriptPath(videoId);
    const { error } = await supabase.storage
      .from("transcripts")
      .remove([path]);

    if (error) {
      throw createStorageError(
        "Failed to delete transcript",
        ErrorCode.STORAGE_UPLOAD_FAILED,
        HttpStatus.INTERNAL_ERROR,
        { details: error }
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error deleting transcript",
      ErrorCode.STORAGE_UPLOAD_FAILED,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
  }
};

/**
 * Check if a transcript exists in storage
 */
export const transcriptExists = async (videoId: string): Promise<boolean> => {
  try {
    const path = getTranscriptPath(videoId);
    const { data, error } = await supabase.storage
      .from("transcripts")
      .list(path.split("/")[0], {
        search: path.split("/")[1],
      });

    if (error) {
      throw createStorageError(
        "Failed to check transcript existence",
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { details: error }
      );
    }

    return data.some((file) => file.name === path.split("/")[1]);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error checking transcript existence",
      ErrorCode.STORAGE_FILE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      { details: error }
    );
  }
}; 