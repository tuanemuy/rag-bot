// Document domain ports
import type { DocumentSource } from "@/core/domain/document/ports/documentSource";
// Message domain ports
import type { MessageSender } from "@/core/domain/message/ports/messageSender";
import type { UserNotifier } from "@/core/domain/message/ports/userNotifier";
// Shared ports
import type { Logger } from "@/core/domain/shared/ports/logger";
// VectorIndex domain ports
import type { IndexBuilder } from "@/core/domain/vectorIndex/ports/indexBuilder";
import type { QueryEngine } from "@/core/domain/vectorIndex/ports/queryEngine";

/**
 * Application configuration
 */
export type ApplicationConfig = {
  /**
   * Batch size for document synchronization
   * Controls how many documents are processed in a single batch
   * @default 100
   */
  syncBatchSize: number;
};

/**
 * Dependency Injection Container
 *
 * Aggregates all ports and services used by the application layer.
 * This type is used at the composition root to initialize the application
 * and for dependency injection in application services.
 */
export type Container = {
  // Application configuration
  config: ApplicationConfig;

  // Shared ports
  logger: Logger;

  // Document domain ports
  documentSource: DocumentSource;

  // VectorIndex domain ports
  indexBuilder: IndexBuilder;
  queryEngine: QueryEngine;

  // Message domain ports
  messageSender: MessageSender;
  userNotifier: UserNotifier;
};
