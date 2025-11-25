import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmptyDocumentSource,
  EmptyIndexBuilder,
  EmptyLogger,
  EmptyMessageSender,
  EmptyUserNotifier,
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
      syncBatchSize: 100,
    },
    logger: new EmptyLogger(),
    documentSource: new EmptyDocumentSource(),
    indexBuilder: new EmptyIndexBuilder(),
    queryEngine: {
      query: vi.fn(),
    },
    messageSender: new EmptyMessageSender(),
    userNotifier: new EmptyUserNotifier(),
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
        isAvailable: true,
      };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue(
        indexStatus,
      );

      const result = await checkStatus(container, input);

      expect(result.indexStatus).toEqual(indexStatus);
    });

    it("ステータスメッセージが正しく返信される", async () => {
      const notifySpy = vi.spyOn(container.userNotifier, "notifyStatus");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });

      await checkStatus(container, input);

      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(input.replyToken, {
        isAvailable: true,
      });
    });

    it("インデックスが利用可能な場合にステータスが表示される", async () => {
      const notifySpy = vi.spyOn(container.userNotifier, "notifyStatus");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });

      await checkStatus(container, input);

      expect(notifySpy).toHaveBeenCalledWith(input.replyToken, {
        isAvailable: true,
      });
    });

    it("インデックスが利用不可の場合に適切なメッセージが表示される", async () => {
      const notifySpy = vi.spyOn(container.userNotifier, "notifyStatus");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: false,
      });

      await checkStatus(container, input);

      expect(notifySpy).toHaveBeenCalledWith(input.replyToken, {
        isAvailable: false,
      });
    });

    it("出力にインデックスステータスが含まれる", async () => {
      const indexStatus: IndexStatus = {
        isAvailable: true,
      };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue(
        indexStatus,
      );

      const result = await checkStatus(container, input);

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

    it("返信送信でエラーが発生した場合に例外がスローされる", async () => {
      const error = new SystemError("NETWORK_ERROR", "Failed to send message");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.userNotifier, "notifyStatus").mockRejectedValue(error);

      await expect(checkStatus(container, input)).rejects.toThrow(error);
    });
  });
});
