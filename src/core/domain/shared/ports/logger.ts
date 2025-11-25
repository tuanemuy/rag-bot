/**
 * Logger port interface
 *
 * Provides logging capabilities for the application.
 * Implementations can use console, file, or external logging services.
 */
export interface Logger {
  /**
   * Log an informational message
   */
  info(message: string, context?: Record<string, unknown>): void;

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void;

  /**
   * Log an error message
   */
  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ): void;

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void;
}
