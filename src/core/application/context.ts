// Answer domain ports
import type { AnswerGenerator } from "@/core/domain/answer/ports/answerGenerator";
import type { DocumentContentFetcher } from "@/core/domain/document/ports/documentContentFetcher";
// Document domain ports
import type { DocumentListFetcher } from "@/core/domain/document/ports/documentListFetcher";
import type { DocumentParser } from "@/core/domain/document/ports/documentParser";
// Message domain ports
import type { MessageSender } from "@/core/domain/message/ports/messageSender";
import type { EmbeddingGenerator } from "@/core/domain/vectorIndex/ports/embeddingGenerator";
// VectorIndex domain ports
import type { TextSplitter } from "@/core/domain/vectorIndex/ports/textSplitter";
import type { VectorStore } from "@/core/domain/vectorIndex/ports/vectorStore";
import type { UnitOfWorkProvider } from "./unitOfWork";

/**
 * Application Context
 *
 * Aggregates all ports and services used by the application layer.
 * Used for dependency injection.
 */
export type ApplicationContext = {
  // Transaction management (repositories are accessed through unitOfWork)
  unitOfWork: UnitOfWorkProvider;

  // Document domain ports
  documentListFetcher: DocumentListFetcher;
  documentContentFetcher: DocumentContentFetcher;
  documentParser: DocumentParser;

  // VectorIndex domain ports
  textSplitter: TextSplitter;
  embeddingGenerator: EmbeddingGenerator;
  vectorStore: VectorStore;

  // Answer domain ports
  answerGenerator: AnswerGenerator;

  // Message domain ports
  messageSender: MessageSender;
};
