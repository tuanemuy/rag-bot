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

export type LlamaIndexOpenAIIndexBuilderConfig = LlamaIndexOpenAIConfig;

/**
 * LlamaIndex + OpenAIを使用したIndexBuilder実装
 */
export class LlamaIndexOpenAIIndexBuilder implements IndexBuilder {
  private vectorStore: PGVectorStore;

  constructor(private readonly config: LlamaIndexOpenAIIndexBuilderConfig) {
    initializeLlamaIndexSettings(config);
    this.vectorStore = createPGVectorStore(config);
  }

  async buildIndex(documents: IndexDocument[]): Promise<IndexBuildResult> {
    const startTime = Date.now();

    try {
      // 既存のインデックスをクリア
      await this.clearIndex();

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

      // ストレージコンテキストを作成
      const storageContext = await storageContextFromDefaults({
        vectorStore: this.vectorStore,
      });

      // インデックスを構築
      await VectorStoreIndex.fromDocuments(llamaDocuments, {
        storageContext,
      });

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
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.InternalServerError,
        "Failed to build index",
        error,
      );
    }
  }

  async getStatus(): Promise<IndexStatus> {
    try {
      const { Client } = await import("pg");
      const client = new Client({
        connectionString: this.config.databaseUrl,
      });

      let entryCount = 0;
      let lastUpdatedAt: Date | null = null;

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

        // lastUpdatedAtはDocumentRepositoryの最大fetchedAtから取得するべきなので
        // IndexBuilder単体では正確な値を返せない。nullを返し、必要に応じて
        // アプリケーション層でDocumentRepositoryから取得して補完する。
        lastUpdatedAt = null;
      } catch {
        entryCount = 0;
      } finally {
        await client.end();
      }

      return {
        entryCount,
        lastUpdatedAt,
        isAvailable: entryCount > 0,
      };
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.InternalServerError,
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
        SystemErrorCode.InternalServerError,
        "Failed to clear index",
        error,
      );
    }
  }
}
