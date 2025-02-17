import { AppError } from "@/lib/types/errors";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error | AppError;
  stack?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableMetrics?: boolean;
}

/**
 * Default logger configuration - Changed to DEBUG level
 */
const defaultConfig: Required<LoggerConfig> = {
  minLevel: LogLevel.DEBUG, // Changed from INFO to DEBUG
  enableConsole: true,
  enableMetrics: false,
};

/**
 * Format error for logging
 */
function formatError(error: Error | AppError): Record<string, unknown> {
  const errorInfo: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  if (error instanceof AppError) {
    errorInfo.code = error.code;
    errorInfo.statusCode = error.statusCode;
    errorInfo.details = error.details;
  }

  return errorInfo;
}

/**
 * Format log message with timestamp and context
 */
function formatLogMessage(entry: LogEntry): string {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const contextStr = entry.context ? `\nContext: ${JSON.stringify(entry.context, null, 2)}` : '';
  const errorStr = entry.error ? `\nError: ${JSON.stringify(formatError(entry.error), null, 2)}` : '';
  return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}${errorStr}`;
}

/**
 * Logger class for consistent logging across the application
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private context: Record<string, unknown>;

  constructor(config: LoggerConfig = {}, context: Record<string, unknown> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.context = context;
  }

  /**
   * Create a new logger with additional context
   */
  withContext(context: Record<string, unknown>): Logger {
    return new Logger(this.config, { ...this.context, ...context });
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error | AppError): void {
    if (this.shouldLog(level)) {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context: { ...this.context, ...context },
      };

      if (error) {
        entry.error = error;
        entry.stack = error.stack;
        entry.context = { ...entry.context, error: formatError(error) };
      }

      this.writeLog(entry);
    }
  }

  /**
   * Check if a message should be logged based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }

  /**
   * Write log entry with improved console formatting
   */
  private writeLog(entry: LogEntry): void {
    if (this.config.enableConsole) {
      const formattedMessage = formatLogMessage(entry);
      
      switch (entry.level) {
        case LogLevel.ERROR:
          console.log('\x1b[31m%s\x1b[0m', formattedMessage); // Red
          break;
        case LogLevel.WARN:
          console.log('\x1b[33m%s\x1b[0m', formattedMessage); // Yellow
          break;
        case LogLevel.INFO:
          console.log('\x1b[36m%s\x1b[0m', formattedMessage); // Cyan
          break;
        case LogLevel.DEBUG:
          console.log('\x1b[90m%s\x1b[0m', formattedMessage); // Gray
          break;
      }
    }

    // TODO: Add additional log destinations (e.g., file, monitoring service)
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  /**
   * Log error message
   */
  error(message: string, error: Error | AppError, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log retry attempt
   */
  logRetry(
    operation: string,
    attempt: number,
    maxAttempts: number,
    error: Error,
    delay: number
  ): void {
    this.warn(
      `Retry attempt ${attempt}/${maxAttempts} for operation: ${operation}`,
      {
        operation,
        attempt,
        maxAttempts,
        delay,
        error: formatError(error),
      },
      error
    );
  }
}

// Create and export default logger instance
export const logger = new Logger(); 