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
import {
  createPGVectorStore,
  initializeLlamaIndexSettings,
  type LlamaIndexOpenAIConfig,
} from "./setup";

export type LlamaIndexOpenAIIndexBuilderConfig = LlamaIndexOpenAIConfig & {
  /** 最大再試行回数 */
  maxRetries?: number;
  /** 再試行時の初期待機時間（ミリ秒） */
  retryDelay?: number;
};

/**
 * LlamaIndex + OpenAIを使用したIndexBuilder実装
 */
export class LlamaIndexOpenAIIndexBuilder implements IndexBuilder {
  private vectorStore: PGVectorStore;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(private readonly config: LlamaIndexOpenAIIndexBuilderConfig) {
    initializeLlamaIndexSettings(config);
    this.vectorStore = createPGVectorStore(config);
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
      const { Client } = await import("pg");
      const client = new Client({
        connectionString: this.config.databaseUrl,
      });

      let entryCount = 0;

      try {
        await client.connect();
        const schemaName = this.config.schemaName ?? "public";
        const tableName = this.config.tableName ?? "llamaindex_vectors";

        const escapedSchema = schemaName.replace(/"/g, '""');
        const escapedTable = tableName.replace(/"/g, '""');

        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM "${escapedSchema}"."${escapedTable}"`,
        );
        entryCount = Number.parseInt(countResult.rows[0].count, 10);
      } catch {
        entryCount = 0;
      } finally {
        await client.end();
      }

      return {
        isAvailable: entryCount > 0,
      };
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.IndexStatusFailed,
        "Failed to get index status",
        error,
      );
    }
  }

  async clearIndex(): Promise<void> {
    try {
      const { Client } = await import("pg");
      const client = new Client({
        connectionString: this.config.databaseUrl,
      });

      try {
        await client.connect();
        const schemaName = this.config.schemaName ?? "public";
        const tableName = this.config.tableName ?? "llamaindex_vectors";

        const escapedSchema = schemaName.replace(/"/g, '""');
        const escapedTable = tableName.replace(/"/g, '""');

        await client.query(
          `TRUNCATE TABLE "${escapedSchema}"."${escapedTable}" CASCADE`,
        );
      } finally {
        await client.end();
      }
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
