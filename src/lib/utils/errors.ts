export class AppError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export enum ErrorCode {
  // API Errors
  API_INVALID_REQUEST = 'api/invalid-request',
  API_SERVICE_UNAVAILABLE = 'api/service-unavailable',
  API_RATE_LIMIT = 'api/rate-limit',

  // Validation Errors
  VALIDATION_INVALID_FORMAT = 'validation/invalid-format',
  VALIDATION_REQUIRED = 'validation/required',
  VALIDATION_INVALID_TYPE = 'validation/invalid-type',

  // Storage Errors
  STORAGE_FILE_NOT_FOUND = 'storage/file-not-found',
  STORAGE_UPLOAD_FAILED = 'storage/upload-failed',
  STORAGE_DOWNLOAD_FAILED = 'storage/download-failed',

  // Video Processing Errors
  VIDEO_NOT_FOUND = 'video/not-found',
  VIDEO_INVALID_URL = 'video/invalid-url',
  VIDEO_PROCESSING_FAILED = 'video/processing-failed',

  // AI Service Errors
  AI_GENERATION_FAILED = 'ai/generation-failed',
  AI_INVALID_RESPONSE = 'ai/invalid-response',
  AI_RATE_LIMIT = 'ai/rate-limit',
} 