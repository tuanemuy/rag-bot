import type { PGVectorStore } from "@llamaindex/postgres";
import { MetadataMode, VectorStoreIndex } from "llamaindex";
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
import {
  createPGVectorStore,
  initializeLlamaIndexSettings,
  type LlamaIndexOpenAIConfig,
} from "./setup";

export type LlamaIndexOpenAIQueryEngineConfig = LlamaIndexOpenAIConfig;

/**
 * LlamaIndex + OpenAIを使用したQueryEngine実装
 */
export class LlamaIndexOpenAIQueryEngine implements QueryEngine {
  private vectorStore: PGVectorStore;

  constructor(config: LlamaIndexOpenAIQueryEngineConfig) {
    initializeLlamaIndexSettings(config);
    this.vectorStore = createPGVectorStore(config);
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
        SystemErrorCode.IndexQueryFailed,
        "Failed to query index",
        error,
      );
    }
  }
}
