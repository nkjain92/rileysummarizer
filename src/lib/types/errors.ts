/**
 * Error codes for the application
 */
export enum ErrorCode {
  // API Errors
  API_SERVICE_UNAVAILABLE = "api/service-unavailable",
  API_RATE_LIMIT = "api/rate-limit",
  API_INVALID_RESPONSE = "api/invalid-response",

  // Database Errors
  DATABASE_ERROR = "database/error",

  // Validation Errors
  VALIDATION_INVALID_FORMAT = "validation/invalid-format",
  VALIDATION_REQUIRED_FIELD = "validation/required-field",
  VALIDATION_INVALID_TYPE = "validation/invalid-type",

  // Storage Errors
  STORAGE_FILE_NOT_FOUND = "storage/file-not-found",
  STORAGE_UPLOAD_FAILED = "storage/upload-failed",
  STORAGE_DOWNLOAD_FAILED = "storage/download-failed",

  // Video Processing Errors
  VIDEO_NOT_FOUND = "video/not-found",
  VIDEO_INVALID_URL = "video/invalid-url",
  VIDEO_PROCESSING_FAILED = "video/processing-failed",

  // AI Service Errors
  AI_GENERATION_FAILED = "ai/generation-failed",
  AI_INVALID_RESPONSE = "ai/invalid-response",
  AI_RATE_LIMIT = "ai/rate-limit",

  INVALID_INPUT = "INVALID_INPUT",
}

/**
 * HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Base error interface
 */
export interface BaseError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Application error class
 */
export class AppError extends Error implements BaseError {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toResponse(): BaseError {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Creates a validation error
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(
    message,
    ErrorCode.VALIDATION_INVALID_FORMAT,
    HttpStatus.BAD_REQUEST,
    details
  );
}

/**
 * Creates an API error
 */
export function createApiError(
  message: string,
  code: ErrorCode = ErrorCode.API_SERVICE_UNAVAILABLE,
  statusCode: number = HttpStatus.INTERNAL_ERROR,
  details?: Record<string, unknown>
): AppError {
  return new AppError(message, code, statusCode, details);
}

/**
 * Creates a storage error
 */
export function createStorageError(
  message: string,
  code: ErrorCode = ErrorCode.STORAGE_FILE_NOT_FOUND,
  statusCode: number = HttpStatus.NOT_FOUND,
  details?: Record<string, unknown>
): AppError {
  return new AppError(message, code, statusCode, details);
}