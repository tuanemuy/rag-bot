import { HttpSitemapDocumentSource } from "@/core/adapters/httpSitemap/documentSource";
import { LineApiClient } from "@/core/adapters/line/lineApiClient";
import { LineUserNotifier } from "@/core/adapters/line/lineUserNotifier";
import { LineMessageSender } from "@/core/adapters/line/messageSender";
import { jaMessages } from "@/core/adapters/line/messages/ja";
import {
  initializeLlamaIndex,
  LlamaIndexGeminiIndexBuilder,
  LlamaIndexGeminiQueryEngine,
} from "@/core/adapters/llamaIndexGemini";
import { ConsoleLogger } from "@/core/adapters/simple/consoleLogger";
import type { Container } from "@/core/application/container";
import type { IndexBuilder } from "@/core/domain/vectorIndex/ports/indexBuilder";
import type { QueryEngine } from "@/core/domain/vectorIndex/ports/queryEngine";

export function withContainer<T extends unknown[], K>(
  fn: (container: Container, ...args: T) => Promise<K>,
): (...args: T) => K | Promise<K> {
  return (...args: T) => {
    const container = createContainer();
    return fn(container, ...args);
  };
}

export function createContainer(): Container {
  // Create adapters
  const logger = new ConsoleLogger();

  // Create LLM adapters (Gemini)
  const { indexBuilder, queryEngine } = createGeminiAdapters();

  // Create document source adapter (HTTP Sitemap)
  const documentSource = new HttpSitemapDocumentSource({
    sitemapUrl: process.env.DOCUMENT_SITEMAP_URL,
    contentSelector: process.env.DOCUMENT_CONTENT_SELECTOR,
    titleSelector: process.env.DOCUMENT_TITLE_SELECTOR,
    timeout: process.env.DOCUMENT_FETCH_TIMEOUT
      ? Number.parseInt(process.env.DOCUMENT_FETCH_TIMEOUT, 10)
      : undefined,
    onError: process.env.DOCUMENT_ON_ERROR as
      | "throw"
      | "skip"
      | "warn"
      | undefined,
    requestDelay: process.env.DOCUMENT_REQUEST_DELAY
      ? Number.parseInt(process.env.DOCUMENT_REQUEST_DELAY, 10)
      : undefined,
    maxRetries: process.env.DOCUMENT_MAX_RETRIES
      ? Number.parseInt(process.env.DOCUMENT_MAX_RETRIES, 10)
      : undefined,
    retryDelay: process.env.DOCUMENT_RETRY_DELAY
      ? Number.parseInt(process.env.DOCUMENT_RETRY_DELAY, 10)
      : undefined,
  });

  // Create LINE API client (shared by MessageSender and UserNotifier)
  const lineApiClient = new LineApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    maxRetries: process.env.LINE_MAX_RETRIES
      ? Number.parseInt(process.env.LINE_MAX_RETRIES, 10)
      : undefined,
    initialDelayMs: process.env.LINE_RETRY_DELAY
      ? Number.parseInt(process.env.LINE_RETRY_DELAY, 10)
      : undefined,
    maxDelayMs: process.env.LINE_MAX_DELAY_MS
      ? Number.parseInt(process.env.LINE_MAX_DELAY_MS, 10)
      : undefined,
    backoffMultiplier: process.env.LINE_BACKOFF_MULTIPLIER
      ? Number.parseFloat(process.env.LINE_BACKOFF_MULTIPLIER)
      : undefined,
  });

  // Create message sender and user notifier
  const messageSender = new LineMessageSender(lineApiClient);
  const userNotifier = new LineUserNotifier(lineApiClient, jaMessages);

  return {
    config: {
      syncBatchSize: process.env.SYNC_BATCH_SIZE
        ? Number.parseInt(process.env.SYNC_BATCH_SIZE, 10)
        : 100,
    },
    logger,
    documentSource,
    indexBuilder,
    queryEngine,
    messageSender,
    userNotifier,
  };
}

/**
 * Create Gemini LLM adapters
 */
function createGeminiAdapters(): {
  indexBuilder: IndexBuilder;
  queryEngine: QueryEngine;
} {
  const databaseUrl = process.env.DATABASE_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is required");
  }

  const chunkSize = process.env.LLM_CHUNK_SIZE
    ? Number.parseInt(process.env.LLM_CHUNK_SIZE, 10)
    : undefined;
  const tableName = process.env.VECTOR_TABLE_NAME;
  const schemaName = process.env.VECTOR_SCHEMA_NAME;

  const geminiConfig = {
    geminiApiKey,
    databaseUrl,
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL,
    llmModel: process.env.GEMINI_LLM_MODEL,
    chunkSize,
    chunkOverlap: process.env.LLM_CHUNK_OVERLAP
      ? Number.parseInt(process.env.LLM_CHUNK_OVERLAP, 10)
      : undefined,
    tableName,
    schemaName,
  };

  // Initialize LlamaIndex settings and create shared vector store
  const vectorStore = initializeLlamaIndex(geminiConfig);

  return {
    indexBuilder: new LlamaIndexGeminiIndexBuilder(vectorStore, {
      chunkSize,
      maxRetries: process.env.INDEX_BUILDER_MAX_RETRIES
        ? Number.parseInt(process.env.INDEX_BUILDER_MAX_RETRIES, 10)
        : undefined,
      retryDelay: process.env.INDEX_BUILDER_RETRY_DELAY
        ? Number.parseInt(process.env.INDEX_BUILDER_RETRY_DELAY, 10)
        : undefined,
    }),
    queryEngine: new LlamaIndexGeminiQueryEngine(vectorStore),
  };
}
