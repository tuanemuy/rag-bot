import { getDatabase } from "@/core/adapters/drizzlePg/client";
import { DrizzlePgUnitOfWork } from "@/core/adapters/drizzlePg/unitOfWork";
import { HttpSitemapDocumentSource } from "@/core/adapters/httpSitemap/documentSource";
import { LineMessageSender } from "@/core/adapters/line/messageSender";
import {
  LlamaIndexGeminiIndexBuilder,
  LlamaIndexGeminiQueryEngine,
} from "@/core/adapters/llamaIndexGemini";
import {
  LlamaIndexOpenAIIndexBuilder,
  LlamaIndexOpenAIQueryEngine,
} from "@/core/adapters/llamaIndexOpenAI";
import { ConsoleLogger } from "@/core/adapters/simple/consoleLogger";
import type { AppConfig, Container } from "@/core/application/container";
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
  // Get configuration from environment variables
  const llmProvider = process.env.LLM_PROVIDER ?? "gemini";
  const config: AppConfig = {
    appUrl: process.env.APP_URL,
    databaseUrl: process.env.DATABASE_URL,
    llmProvider: llmProvider as "openai" | "gemini",
    openaiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  };

  // Create database instance
  const db = getDatabase(config.databaseUrl);

  // Create adapters
  const unitOfWork = new DrizzlePgUnitOfWork(db);
  const logger = new ConsoleLogger();

  // Create LLM adapters based on provider
  const { indexBuilder, queryEngine } = createLLMAdapters(config);

  // Create document source adapter (HTTP Sitemap)
  const documentSource = new HttpSitemapDocumentSource({
    sitemapUrl: process.env.DOCUMENT_SITEMAP_URL,
    contentSelector: process.env.DOCUMENT_CONTENT_SELECTOR,
    titleSelector: process.env.DOCUMENT_TITLE_SELECTOR,
  });

  // Create message sender
  const messageSender = new LineMessageSender({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  });

  return {
    config,
    unitOfWork,
    logger,
    documentSource,
    indexBuilder,
    queryEngine,
    messageSender,
  };
}

/**
 * Create LLM adapters based on the configured provider
 */
function createLLMAdapters(config: AppConfig): {
  indexBuilder: IndexBuilder;
  queryEngine: QueryEngine;
} {
  if (config.llmProvider === "gemini") {
    if (!config.geminiApiKey) {
      throw new Error(
        "GEMINI_API_KEY is required when LLM_PROVIDER is set to gemini",
      );
    }

    const geminiConfig = {
      geminiApiKey: config.geminiApiKey,
      databaseUrl: config.databaseUrl,
    };

    return {
      indexBuilder: new LlamaIndexGeminiIndexBuilder(geminiConfig),
      queryEngine: new LlamaIndexGeminiQueryEngine(geminiConfig),
    };
  }

  // Default to OpenAI
  if (!config.openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when LLM_PROVIDER is set to openai",
    );
  }

  const openaiConfig = {
    openaiApiKey: config.openaiApiKey,
    databaseUrl: config.databaseUrl,
  };

  return {
    indexBuilder: new LlamaIndexOpenAIIndexBuilder(openaiConfig),
    queryEngine: new LlamaIndexOpenAIQueryEngine(openaiConfig),
  };
}
