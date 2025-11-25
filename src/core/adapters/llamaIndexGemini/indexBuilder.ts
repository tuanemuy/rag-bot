import type { PGVectorStore } from "@llamaindex/postgres";
import {
  Document,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { IndexBuilder } from "@/core/domain/vectorIndex/ports/indexBuilder";
import type {
  IndexBuildResult,
  IndexDocument,
  IndexStatus,
} from "@/core/domain/vectorIndex/valueObject";
import type { LlamaIndexGeminiConfig } from "./setup";

export type LlamaIndexGeminiIndexBuilderConfig = Pick<
  LlamaIndexGeminiConfig,
  "chunkSize"
> & {
  /** 最大再試行回数 */
  maxRetries?: number;
  /** 再試行時の初期待機時間（ミリ秒） */
  retryDelay?: number;
};

/**
 * LlamaIndex + Geminiを使用したIndexBuilder実装
 */
export class LlamaIndexGeminiIndexBuilder implements IndexBuilder {
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    private readonly vectorStore: PGVectorStore,
    private readonly config: LlamaIndexGeminiIndexBuilderConfig,
  ) {
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  async addDocuments(documents: IndexDocument[]): Promise<IndexBuildResult> {
    const startTime = Date.now();

    if (documents.length === 0) {
      return {
        totalDocuments: 0,
        totalEntries: 0,
        buildDuration: 0,
      };
    }

    // LlamaIndex用のDocumentに変換
    const llamaDocuments = documents.map(
      (doc) =>
        new Document({
          text: doc.content,
          id_: doc.id,
          metadata: {
            documentId: doc.id,
            title: doc.title,
          },
        }),
    );

    // リトライ付きでインデックスに追加
    await this.addDocumentsWithRetry(llamaDocuments);

    // エントリ数を取得（概算）
    const avgChunksPerDoc = Math.ceil(
      documents.reduce((sum, doc) => sum + doc.content.length, 0) /
        documents.length /
        (this.config.chunkSize ?? 1000),
    );
    const estimatedEntries = documents.length * avgChunksPerDoc;

    const buildDuration = Date.now() - startTime;

    return {
      totalDocuments: documents.length,
      totalEntries: estimatedEntries,
      buildDuration,
    };
  }

  async getStatus(): Promise<IndexStatus> {
    try {
      await this.vectorStore.client();
      return {
        isAvailable: true,
      };
    } catch {
      // If query fails, the index is not available
      return {
        isAvailable: false,
      };
    }
  }

  async clearIndex(): Promise<void> {
    try {
      // PGVectorStoreの提供するclearCollectionメソッドを使用
      await this.vectorStore.clearCollection();
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.IndexClearFailed,
        "Failed to clear index",
        error,
      );
    }
  }

  /**
   * リトライ付きでドキュメントをインデックスに追加
   */
  private async addDocumentsWithRetry(
    llamaDocuments: Document[],
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // ストレージコンテキストを作成
        const storageContext = await storageContextFromDefaults({
          vectorStore: this.vectorStore,
        });

        // インデックスにドキュメントを追加
        await VectorStoreIndex.fromDocuments(llamaDocuments, {
          storageContext,
        });

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          // exponential backoff
          const delayMs = this.retryDelay * 2 ** attempt;
          await this.delay(delayMs);
        }
      }
    }

    throw new SystemError(
      SystemErrorCode.IndexAddFailed,
      "Failed to add documents to index",
      lastError,
    );
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
