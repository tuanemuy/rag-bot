import type { Logger } from "@/core/domain/shared/ports/logger";

/**
 * Empty Logger implementation for testing
 *
 * All logging methods are no-ops.
 */
export class EmptyLogger implements Logger {
  info(_message: string, _context?: Record<string, unknown>): void {
    // no-op
  }

  warn(_message: string, _context?: Record<string, unknown>): void {
    // no-op
  }

  error(
    _message: string,
    _error?: unknown,
    _context?: Record<string, unknown>,
  ): void {
    // no-op
  }

  debug(_message: string, _context?: Record<string, unknown>): void {
    // no-op
  }
}
