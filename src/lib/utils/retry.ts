import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "./logger";
import { DatabaseResponse } from "@/lib/types/storage";

/**
 * Options for retry mechanism
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
  operationName?: string;
}

/**
 * Default retry options
 */
const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "NETWORK_ERROR",
    "RATE_LIMIT",
  ],
  operationName: "unknown",
};

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if an error is retryable
 */
const isRetryableError = (error: any, retryableErrors: string[]): boolean => {
  if (!error) return false;

  // Check error code
  if (error.code && retryableErrors.includes(error.code)) return true;

  // Check error type
  if (error.type && retryableErrors.includes(error.type)) return true;

  // Check HTTP status codes
  if (error.status) {
    const status = error.status;
    return (
      status === 408 || // Request Timeout
      status === 429 || // Too Many Requests
      status === 500 || // Internal Server Error
      status === 502 || // Bad Gateway
      status === 503 || // Service Unavailable
      status === 504    // Gateway Timeout
    );
  }

  return false;
};

/**
 * Calculate delay for next retry attempt
 */
const calculateDelay = (
  attempt: number,
  { initialDelay, maxDelay, backoffFactor }: Required<RetryOptions>
): number => {
  const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
  return Math.min(delay, maxDelay);
};

/**
 * Retry a database operation
 */
export async function retryDatabase<T>(
  fn: () => Promise<DatabaseResponse<T>>,
  options: RetryOptions = {}
): Promise<DatabaseResponse<T>> {
  const retryOptions: Required<RetryOptions> = {
    ...defaultOptions,
    ...options,
  };

  let lastError: any;
  for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
    try {
      const result = await fn();
      
      if (result.error) {
        if (!isRetryableError(result.error, retryOptions.retryableErrors)) {
          logger.error(
            `Non-retryable database error in operation: ${retryOptions.operationName}`,
            result.error,
            { attempt, maxAttempts: retryOptions.maxAttempts }
          );
          return result;
        }

        if (attempt === retryOptions.maxAttempts) {
          logger.error(
            `Database operation failed after ${attempt} attempts: ${retryOptions.operationName}`,
            result.error,
            { attempt, maxAttempts: retryOptions.maxAttempts }
          );
          return result;
        }

        const delay = calculateDelay(attempt, retryOptions);
        logger.logRetry(
          retryOptions.operationName,
          attempt,
          retryOptions.maxAttempts,
          result.error,
          delay
        );

        await sleep(delay);
        continue;
      }

      return result;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error, retryOptions.retryableErrors)) {
        logger.error(
          `Non-retryable error in operation: ${retryOptions.operationName}`,
          error as Error,
          { attempt, maxAttempts: retryOptions.maxAttempts }
        );
        throw error;
      }

      if (attempt === retryOptions.maxAttempts) {
        logger.error(
          `Operation failed after ${attempt} attempts: ${retryOptions.operationName}`,
          error as Error,
          { attempt, maxAttempts: retryOptions.maxAttempts }
        );
        break;
      }

      const delay = calculateDelay(attempt, retryOptions);
      logger.logRetry(
        retryOptions.operationName,
        attempt,
        retryOptions.maxAttempts,
        error as Error,
        delay
      );

      await sleep(delay);
    }
  }

  throw new AppError(
    `Operation '${retryOptions.operationName}' failed after ${retryOptions.maxAttempts} attempts`,
    ErrorCode.API_SERVICE_UNAVAILABLE,
    HttpStatus.SERVICE_UNAVAILABLE,
    { details: lastError }
  );
}

/**
 * Retry an API operation
 */
export async function retryApi<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retryOptions: Required<RetryOptions> = {
    ...defaultOptions,
    ...options,
  };

  let lastError: any;
  for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error, retryOptions.retryableErrors)) {
        logger.error(
          `Non-retryable API error in operation: ${retryOptions.operationName}`,
          error as Error,
          { attempt, maxAttempts: retryOptions.maxAttempts }
        );
        throw error;
      }

      if (attempt === retryOptions.maxAttempts) {
        logger.error(
          `API operation failed after ${attempt} attempts: ${retryOptions.operationName}`,
          error as Error,
          { attempt, maxAttempts: retryOptions.maxAttempts }
        );
        break;
      }

      const delay = calculateDelay(attempt, retryOptions);
      logger.logRetry(
        retryOptions.operationName,
        attempt,
        retryOptions.maxAttempts,
        error as Error,
        delay
      );

      await sleep(delay);
    }
  }

  throw new AppError(
    `API operation '${retryOptions.operationName}' failed after ${retryOptions.maxAttempts} attempts`,
    ErrorCode.API_SERVICE_UNAVAILABLE,
    HttpStatus.SERVICE_UNAVAILABLE,
    { details: lastError }
  );
}

// Maintain backward compatibility
export const retry = retryDatabase; 