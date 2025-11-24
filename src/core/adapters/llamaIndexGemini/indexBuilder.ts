import {
  type GEMINI_EMBEDDING_MODEL,
  type GEMINI_MODEL,
  Gemini,
  GeminiEmbedding,
} from "@llamaindex/google";
import { PGVectorStore } from "@llamaindex/postgres";
import {
  Document,
  Settings,
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

export type LlamaIndexGeminiIndexBuilderConfig = {
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
 * LlamaIndex + Geminiを使用したIndexBuilder実装
 */
export class LlamaIndexGeminiIndexBuilder implements IndexBuilder {
  private vectorStore: PGVectorStore;

  constructor(private readonly config: LlamaIndexGeminiIndexBuilderConfig) {
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

        if (entryCount > 0) {
          lastUpdatedAt = new Date();
        }
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
