import {
  type GEMINI_EMBEDDING_MODEL,
  type GEMINI_MODEL,
  Gemini,
  GeminiEmbedding,
} from "@llamaindex/google";
import { PGVectorStore } from "@llamaindex/postgres";
import { Settings } from "llamaindex";

/**
 * LlamaIndex + Gemini の共通設定
 */
export type LlamaIndexGeminiConfig = {
  geminiApiKey: string;
  databaseUrl: string;
  embeddingModel: string;
  llmModel: string;
  chunkSize?: number;
  chunkOverlap?: number;
  tableName?: string;
  schemaName?: string;
  dimensions?: number;
  collection?: string;
};

/**
 * LlamaIndexを初期化し、共有のPGVectorStoreインスタンスを返す
 */
export function initializeLlamaIndex(
  config: LlamaIndexGeminiConfig,
): PGVectorStore {
  // Gemini LLMの設定
  Settings.llm = new Gemini({
    model: config.llmModel as GEMINI_MODEL,
    apiKey: config.geminiApiKey,
  });

  // Gemini Embeddingの設定
  Settings.embedModel = new GeminiEmbedding({
    model: config.embeddingModel as GEMINI_EMBEDDING_MODEL,
    apiKey: config.geminiApiKey,
  });

  // チャンクサイズの設定
  Settings.chunkSize = config.chunkSize ?? 1024;
  Settings.chunkOverlap = config.chunkOverlap ?? 20;

  // 共有のPGVectorStoreインスタンスを作成
  const vectorStore = new PGVectorStore({
    clientConfig: {
      connectionString: config.databaseUrl,
    },
    schemaName: config.schemaName ?? "public",
    tableName: config.tableName ?? "llamaindex_embedding",
    dimensions: config.dimensions ?? 3072, // Gemini Embedding 001のデフォルト
  });

  // コレクションを設定（データ分離用）
  if (config.collection) {
    vectorStore.setCollection(config.collection);
  }

  return vectorStore;
}
