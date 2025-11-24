import {
  type GEMINI_EMBEDDING_MODEL,
  type GEMINI_MODEL,
  Gemini,
  GeminiEmbedding,
} from "@llamaindex/google";
import { PGVectorStore } from "@llamaindex/postgres";
import { MetadataMode, Settings, VectorStoreIndex } from "llamaindex";
import {
  NotFoundError,
  NotFoundErrorCode,
  SystemError,
  SystemErrorCode,
} from "@/core/application/error";
import { createSimilarityScore } from "@/core/domain/shared";
import type { QueryEngine } from "@/core/domain/vectorIndex/ports/queryEngine";
import type {
  DocumentId,
  QueryResult,
  QuerySource,
} from "@/core/domain/vectorIndex/valueObject";

export type LlamaIndexGeminiQueryEngineConfig = {
  geminiApiKey: string;
  databaseUrl: string;
  embeddingModel?: string;
  llmModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  tableName?: string;
  schemaName?: string;
};

/**
 * LlamaIndex + Geminiを使用したQueryEngine実装
 */
export class LlamaIndexGeminiQueryEngine implements QueryEngine {
  private vectorStore: PGVectorStore;

  constructor(config: LlamaIndexGeminiQueryEngineConfig) {
    // Gemini LLMの設定
    Settings.llm = new Gemini({
      model: (config.llmModel ?? "gemini-1.5-flash") as GEMINI_MODEL,
      apiKey: config.geminiApiKey,
    });

    // Gemini Embeddingの設定
    Settings.embedModel = new GeminiEmbedding({
      model: (config.embeddingModel ??
        "text-embedding-004") as GEMINI_EMBEDDING_MODEL,
      apiKey: config.geminiApiKey,
    });

    // チャンクサイズの設定
    Settings.chunkSize = config.chunkSize ?? 1000;
    Settings.chunkOverlap = config.chunkOverlap ?? 200;

    // PGVectorStoreの初期化
    this.vectorStore = new PGVectorStore({
      clientConfig: {
        connectionString: config.databaseUrl,
      },
      schemaName: config.schemaName ?? "public",
      tableName: config.tableName ?? "llamaindex_vectors",
    });
  }

  async query(question: string, topK: number): Promise<QueryResult> {
    try {
      // DBからインデックスを復元
      let index: VectorStoreIndex;
      try {
        index = await VectorStoreIndex.fromVectorStore(this.vectorStore);
      } catch {
        throw new NotFoundError(
          NotFoundErrorCode.NotFound,
          "Index is not available. Please build the index first.",
        );
      }

      // クエリエンジンを作成
      const queryEngine = index.asQueryEngine({
        similarityTopK: topK,
      });

      // クエリを実行
      const response = await queryEngine.query({ query: question });

      // ソース情報を抽出
      const sources: QuerySource[] = (response.sourceNodes ?? []).map(
        (node) => {
          const metadata = node.node.metadata as {
            documentId?: string;
            title?: string;
          };
          return {
            documentId: (metadata.documentId ?? node.node.id_) as DocumentId,
            documentTitle: metadata.title ?? "Unknown",
            relevantContent: node.node
              .getContent(MetadataMode.NONE)
              .substring(0, 500),
            score: createSimilarityScore(node.score ?? 0),
          };
        },
      );

      return {
        answer: response.toString(),
        sources,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new SystemError(
        SystemErrorCode.InternalServerError,
        "Failed to query index",
        error,
      );
    }
  }
}
