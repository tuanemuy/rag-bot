import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmptyDocumentSource,
  EmptyIndexBuilder,
  EmptyLogger,
  EmptyMessageSender,
  EmptyUnitOfWork,
} from "@/core/adapters/empty";
import type { Container } from "@/core/application/container";
import { SystemError } from "@/core/application/error";
import type { Document } from "@/core/domain/document/entity";
import {
  createDocumentContent,
  createDocumentTitle,
  createDocumentUrl,
} from "@/core/domain/document/valueObject";
import type {
  EventSource,
  ReplyToken,
} from "@/core/domain/message/valueObject";
import { createDocumentId } from "@/core/domain/shared";
import { type SyncDocumentsInput, syncDocuments } from "./syncDocuments";

// テスト用のヘルパー関数
function createTestContainer(): Container {
  return {
    config: {
      appUrl: "http://localhost:3000",
      databaseUrl: "postgresql://localhost:5432/test",
      llmProvider: "openai",
      openaiApiKey: "test-api-key",
    },
    unitOfWork: new EmptyUnitOfWork(),
    logger: new EmptyLogger(),
    documentSource: new EmptyDocumentSource(),
    indexBuilder: new EmptyIndexBuilder(),
    queryEngine: {
      query: vi.fn().mockResolvedValue({ answer: "", sources: [] }),
    },
    messageSender: new EmptyMessageSender(),
  };
}

function createTestInput(): SyncDocumentsInput {
  return {
    replyToken: "test-reply-token" as ReplyToken,
    eventSource: {
      type: "user",
      userId: "test-user-id",
    } as EventSource,
  };
}

function createTestDocument(id: string, content: string): Document {
  return {
    id: createDocumentId(id),
    title: createDocumentTitle(`Title ${id}`),
    content: createDocumentContent(content),
    metadata: {
      sourceUrl: createDocumentUrl(`https://example.com/${id}`),
      additionalData: {},
    },
    fetchedAt: new Date(),
  };
}

// DocumentSourceのモックを作成するヘルパー
function createMockDocumentSource(documents: Document[]) {
  return {
    async *iterate(): AsyncIterable<Document> {
      for (const doc of documents) {
        yield doc;
      }
    },
  };
}

describe("syncDocuments", () => {
  let container: Container;
  let input: SyncDocumentsInput;

  beforeEach(() => {
    container = createTestContainer();
    input = createTestInput();
  });

  describe("正常系", () => {
    it("有効なドキュメントで正常に同期できる", async () => {
      const doc = createTestDocument("doc-1", "Test content");

      container.documentSource = createMockDocumentSource([doc]);
      vi.spyOn(container.indexBuilder, "buildIndex").mockResolvedValue({
        totalDocuments: 1,
        totalEntries: 5,
        buildDuration: 1000,
      });

      const result = await syncDocuments(container, input);

      expect(result.totalDocuments).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.totalEntries).toBe(5);
    });

    it("複数のドキュメントを正しく同期できる", async () => {
      const docs = [
        createTestDocument("doc-1", "Content 1"),
        createTestDocument("doc-2", "Content 2"),
        createTestDocument("doc-3", "Content 3"),
      ];

      container.documentSource = createMockDocumentSource(docs);
      vi.spyOn(container.indexBuilder, "buildIndex").mockResolvedValue({
        totalDocuments: 3,
        totalEntries: 15,
        buildDuration: 3000,
      });

      const result = await syncDocuments(container, input);

      expect(result.totalDocuments).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.totalEntries).toBe(15);
    });

    it("ドキュメントがない場合は適切なメッセージを返す", async () => {
      container.documentSource = createMockDocumentSource([]);
      const pushSpy = vi.spyOn(container.messageSender, "push");

      const result = await syncDocuments(container, input);

      expect(result.totalDocuments).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.totalEntries).toBe(0);
      expect(pushSpy).toHaveBeenCalled();
    });

    it("同期開始メッセージを返信する", async () => {
      container.documentSource = createMockDocumentSource([]);
      const replySpy = vi.spyOn(container.messageSender, "reply");

      await syncDocuments(container, input);

      expect(replySpy).toHaveBeenCalled();
    });

    it("同期完了後にPushメッセージを送信する", async () => {
      const doc = createTestDocument("doc-1", "Test content");
      container.documentSource = createMockDocumentSource([doc]);
      vi.spyOn(container.indexBuilder, "buildIndex").mockResolvedValue({
        totalDocuments: 1,
        totalEntries: 5,
        buildDuration: 1000,
      });
      const pushSpy = vi.spyOn(container.messageSender, "push");

      await syncDocuments(container, input);

      expect(pushSpy).toHaveBeenCalled();
    });
  });

  describe("エラー系", () => {
    it("DocumentSourceでエラーが発生した場合はエラーメッセージを送信する", async () => {
      const errorSource = {
        async *iterate(): AsyncIterable<Document> {
          yield* []; // Generator must have at least one yield
          throw new SystemError("NETWORK_ERROR", "Failed to fetch documents");
        },
      };
      container.documentSource = errorSource;
      const pushSpy = vi.spyOn(container.messageSender, "push");

      await expect(syncDocuments(container, input)).rejects.toThrow();
      expect(pushSpy).toHaveBeenCalled();
    });

    it("indexBuilderでエラーが発生した場合はエラーメッセージを送信する", async () => {
      const doc = createTestDocument("doc-1", "Test content");
      container.documentSource = createMockDocumentSource([doc]);
      vi.spyOn(container.indexBuilder, "buildIndex").mockRejectedValue(
        new SystemError("INTERNAL_SERVER_ERROR", "Failed to build index"),
      );
      const pushSpy = vi.spyOn(container.messageSender, "push");

      await expect(syncDocuments(container, input)).rejects.toThrow();
      expect(pushSpy).toHaveBeenCalled();
    });

    it("Push通知が失敗した場合でもエラーをログに記録する", async () => {
      const errorSource = {
        async *iterate(): AsyncIterable<Document> {
          yield* []; // Generator must have at least one yield
          throw new SystemError("NETWORK_ERROR", "Failed to fetch documents");
        },
      };
      container.documentSource = errorSource;
      vi.spyOn(container.messageSender, "push").mockRejectedValue(
        new Error("Push failed"),
      );
      const logSpy = vi.spyOn(container.logger, "error");

      await expect(syncDocuments(container, input)).rejects.toThrow();
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe("トランザクション処理", () => {
    it("既存ドキュメントを削除してから新規ドキュメントを保存する", async () => {
      const doc = createTestDocument("doc-1", "Test content");
      container.documentSource = createMockDocumentSource([doc]);
      vi.spyOn(container.indexBuilder, "buildIndex").mockResolvedValue({
        totalDocuments: 1,
        totalEntries: 5,
        buildDuration: 1000,
      });

      const runInTxSpy = vi.spyOn(container.unitOfWork, "runInTx");

      await syncDocuments(container, input);

      expect(runInTxSpy).toHaveBeenCalled();
    });
  });
});
