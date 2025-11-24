import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { PGVectorStore } from "@llamaindex/postgres";
import { Settings } from "llamaindex";

/**
 * LlamaIndex + OpenAI の共通設定
 */
export type LlamaIndexOpenAIConfig = {
  openaiApiKey: string;
  databaseUrl: string;
  embeddingModel?: string;
  llmModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  tableName?: string;
  schemaName?: string;
};

/**
 * LlamaIndexのグローバル設定を初期化
 */
export function initializeLlamaIndexSettings(
  config: LlamaIndexOpenAIConfig,
): void {
  // OpenAI LLMの設定
  Settings.llm = new OpenAI({
    model: config.llmModel ?? "gpt-4o-mini",
    apiKey: config.openaiApiKey,
  });

  // OpenAI Embeddingの設定
  Settings.embedModel = new OpenAIEmbedding({
    model: config.embeddingModel ?? "text-embedding-3-small",
    apiKey: config.openaiApiKey,
  });

  // チャンクサイズの設定
  Settings.chunkSize = config.chunkSize ?? 1000;
  Settings.chunkOverlap = config.chunkOverlap ?? 200;
}

/**
 * PGVectorStoreを作成
 */
export function createPGVectorStore(
  config: LlamaIndexOpenAIConfig,
): PGVectorStore {
  return new PGVectorStore({
    clientConfig: {
      connectionString: config.databaseUrl,
    },
    schemaName: config.schemaName ?? "public",
    tableName: config.tableName ?? "llamaindex_vectors",
  });
}
