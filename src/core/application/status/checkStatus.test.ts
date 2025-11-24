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
import type { ReplyToken } from "@/core/domain/message/valueObject";
import type { IndexStatus } from "@/core/domain/vectorIndex/valueObject";
import { type CheckStatusInput, checkStatus } from "./checkStatus";

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
      query: vi.fn(),
    },
    messageSender: new EmptyMessageSender(),
  };
}

function createTestInput(): CheckStatusInput {
  return {
    replyToken: "test-reply-token" as ReplyToken,
  };
}

describe("checkStatus", () => {
  let container: Container;
  let input: CheckStatusInput;

  beforeEach(() => {
    container = createTestContainer();
    input = createTestInput();
  });

  describe("正常系", () => {
    it("インデックスステータスが正しく取得される", async () => {
      const indexStatus: IndexStatus = {
        entryCount: 100,
        lastUpdatedAt: new Date("2024-01-01T10:00:00Z"),
        isAvailable: true,
      };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue(
        indexStatus,
      );

      const result = await checkStatus(container, input);

      expect(result.indexStatus).toEqual(indexStatus);
    });

    it("ドキュメント数が正しく取得される", async () => {
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(50);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 100,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });

      const result = await checkStatus(container, input);

      expect(result.documentCount).toBe(50);
    });

    it("ステータスメッセージが正しく返信される", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(10);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 50,
        lastUpdatedAt: new Date("2024-01-15T10:30:00Z"),
        isAvailable: true,
      });

      await checkStatus(container, input);

      expect(replySpy).toHaveBeenCalledTimes(1);
      expect(replySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          replyToken: input.replyToken,
          messages: expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              text: expect.stringContaining("インデックス状態:"),
            }),
          ]),
        }),
      );
    });

    it("ドキュメント数がメッセージに含まれる", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(25);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 100,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages[0].text).toContain("ドキュメント数: 25件");
    });

    it("エントリ数がメッセージに含まれる", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(10);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 150,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages[0].text).toContain("エントリ数: 150件");
    });

    it("最終更新日時がメッセージに含まれる", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(10);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 100,
        lastUpdatedAt: new Date("2024-03-15T14:30:00Z"),
        isAvailable: true,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages[0].text).toContain("最終更新:");
    });

    it("インデックスが利用可能な場合にステータスが表示される", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(10);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 100,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages[0].text).toContain("ステータス: 利用可能");
    });

    it("インデックスが利用不可の場合に適切なメッセージが表示される", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(0);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 0,
        lastUpdatedAt: null,
        isAvailable: false,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages[0].text).toContain("ステータス: 利用不可");
      expect(call.messages[0].text).toContain("syncコマンドを実行してください");
    });

    it("最終更新日時がnullの場合に「不明」と表示される", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(0);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 0,
        lastUpdatedAt: null,
        isAvailable: false,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages[0].text).toContain("最終更新: 不明");
    });

    it("出力にドキュメント数とインデックスステータスが含まれる", async () => {
      const indexStatus: IndexStatus = {
        entryCount: 100,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      };
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(50);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue(
        indexStatus,
      );

      const result = await checkStatus(container, input);

      expect(result.documentCount).toBe(50);
      expect(result.indexStatus).toEqual(indexStatus);
    });
  });

  describe("異常系", () => {
    it("ステータス取得でエラーが発生した場合に例外がスローされる", async () => {
      const error = new SystemError(
        "INTERNAL_SERVER_ERROR",
        "Failed to get status",
      );

      vi.spyOn(container.indexBuilder, "getStatus").mockRejectedValue(error);

      await expect(checkStatus(container, input)).rejects.toThrow(error);
    });

    it("ドキュメント数取得でエラーが発生した場合に例外がスローされる", async () => {
      const error = new SystemError(
        "DATABASE_ERROR",
        "Failed to count documents",
      );
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockRejectedValue(
        error,
      );

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 100,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });

      await expect(checkStatus(container, input)).rejects.toThrow(error);
    });

    it("返信送信でエラーが発生した場合に例外がスローされる", async () => {
      const error = new SystemError("NETWORK_ERROR", "Failed to send message");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(10);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 100,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });
      vi.spyOn(container.messageSender, "reply").mockRejectedValue(error);

      await expect(checkStatus(container, input)).rejects.toThrow(error);
    });
  });

  describe("境界値", () => {
    it("ドキュメント数が0の場合に正しく表示される", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(0);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 0,
        lastUpdatedAt: null,
        isAvailable: false,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages[0].text).toContain("ドキュメント数: 0件");
      expect(call.messages[0].text).toContain("エントリ数: 0件");
    });

    it("大量のドキュメントとエントリがある場合に正しく表示される", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(
        10000,
      );

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 50000,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages[0].text).toContain("ドキュメント数: 10000件");
      expect(call.messages[0].text).toContain("エントリ数: 50000件");
    });
  });

  describe("メッセージフォーマット", () => {
    it("メッセージが改行で区切られている", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(10);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 100,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      const lines = call.messages[0].text.split("\n");
      expect(lines.length).toBeGreaterThan(1);
    });

    it("各項目がハイフンで始まる", async () => {
      const replySpy = vi.spyOn(container.messageSender, "reply");
      const repositories = (
        container.unitOfWork as EmptyUnitOfWork
      ).getRepositories();
      vi.spyOn(repositories.documentRepository, "count").mockResolvedValue(10);

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        entryCount: 100,
        lastUpdatedAt: new Date(),
        isAvailable: true,
      });

      await checkStatus(container, input);

      const call = replySpy.mock.calls[0][0];
      const lines = call.messages[0].text.split("\n");
      const itemLines = lines.slice(1);
      for (const line of itemLines) {
        expect(line.startsWith("- ")).toBe(true);
      }
    });
  });
});
