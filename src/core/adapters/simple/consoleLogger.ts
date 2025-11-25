import type { Logger } from "@/core/domain/shared/ports/logger";

/**
 * Console-based Logger implementation
 *
 * Outputs logs to the console with structured formatting.
 */
export class ConsoleLogger implements Logger {
  info(message: string, context?: Record<string, unknown>): void {
    console.info(this.formatMessage("INFO", message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatMessage("WARN", message, context));
  }

  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ): void {
    const formattedMessage = this.formatMessage("ERROR", message, context);
    if (error !== undefined) {
      // Pass error object directly to console.error so it can format the stack trace properly
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(this.formatMessage("DEBUG", message, context));
  }

  private formatMessage(
    level: string,
    message: string,
    context?: Record<string, unknown>,
  ): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level}] ${message}`;
    if (context && Object.keys(context).length > 0) {
      return `${base} ${JSON.stringify(context)}`;
    }
    return base;
  }
}
