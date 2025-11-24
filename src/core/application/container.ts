// Document domain ports
import type { DocumentSource } from "@/core/domain/document/ports/documentSource";
// Message domain ports
import type { MessageSender } from "@/core/domain/message/ports/messageSender";
// Shared ports
import type { Logger } from "@/core/domain/shared/ports/logger";
// VectorIndex domain ports
import type { IndexBuilder } from "@/core/domain/vectorIndex/ports/indexBuilder";
import type { QueryEngine } from "@/core/domain/vectorIndex/ports/queryEngine";
import type { UnitOfWork } from "./unitOfWork";

/**
 * Application configuration
 */
export type AppConfig = {
  appUrl: string;
  databaseUrl: string;
  llmProvider: "openai" | "gemini";
  openaiApiKey?: string;
  geminiApiKey?: string;
};

/**
 * Dependency Injection Container
 *
 * Aggregates all ports and services used by the application layer.
 * This type is used at the composition root to initialize the application
 * and for dependency injection in application services.
 */
export type Container = {
  config: AppConfig;

  // Transaction management (repositories are accessed through unitOfWork)
  unitOfWork: UnitOfWork;

  // Shared ports
  logger: Logger;

  // Document domain ports
  documentSource: DocumentSource;

  // VectorIndex domain ports
  indexBuilder: IndexBuilder;
  queryEngine: QueryEngine;

  // Message domain ports
  messageSender: MessageSender;
};
