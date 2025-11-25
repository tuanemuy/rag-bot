import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmptyDocumentSource,
  EmptyIndexBuilder,
  EmptyLogger,
  EmptyMessageSender,
  EmptyQueryEngine,
  EmptyUserNotifier,
} from "@/core/adapters/empty";
import type { Container } from "@/core/application/container";
import { SystemError } from "@/core/application/error";
import { BusinessRuleError } from "@/core/domain/error";
import type { ReplyToken } from "@/core/domain/message/valueObject";
import { createDocumentId, createSimilarityScore } from "@/core/domain/shared";
import type { QueryResult } from "@/core/domain/vectorIndex/valueObject";
import { type AnswerQuestionInput, answerQuestion } from "./answerQuestion";

// テスト用のヘルパー関数
function createTestContainer(): Container {
  return {
    config: {
      syncBatchSize: 100,
    },
    logger: new EmptyLogger(),
    documentSource: new EmptyDocumentSource(),
    indexBuilder: new EmptyIndexBuilder(),
    queryEngine: new EmptyQueryEngine(),
    messageSender: new EmptyMessageSender(),
    userNotifier: new EmptyUserNotifier(),
  };
}

function createTestInput(): AnswerQuestionInput {
  return {
    replyToken: "test-reply-token" as ReplyToken,
    questionText: "テスト質問",
    topK: 5,
  };
}

function createTestQueryResult(answer: string): QueryResult {
  return {
    answer,
    sources: [
      {
        documentId: createDocumentId("doc-1"),
        documentTitle: "Test Document 1",
        relevantContent: "Relevant content 1",
        score: createSimilarityScore(0.9),
      },
      {
        documentId: createDocumentId("doc-2"),
        documentTitle: "Test Document 2",
        relevantContent: "Relevant content 2",
        score: createSimilarityScore(0.8),
      },
    ],
  };
}

describe("answerQuestion", () => {
  let container: Container;
  let input: AnswerQuestionInput;

  beforeEach(() => {
    container = createTestContainer();
    input = createTestInput();
  });

  describe("正常系", () => {
    it("有効な質問で回答が生成される", async () => {
      const queryResult = createTestQueryResult("テスト回答");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);

      expect(result.answer.content).toBe("テスト回答");
      expect(result.answer.sources).toHaveLength(2);
    });

    it("回答がLINEに正しく返信される", async () => {
      const queryResult = createTestQueryResult("テスト回答");
      const replySpy = vi.spyOn(container.messageSender, "reply");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      await answerQuestion(container, input);

      expect(replySpy).toHaveBeenCalledTimes(1);
      expect(replySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          replyToken: input.replyToken,
          messages: expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              text: "テスト回答",
            }),
          ]),
        }),
      );
    });

    it("複数の関連ドキュメントから回答が生成される", async () => {
      const queryResult: QueryResult = {
        answer: "複合回答",
        sources: [
          {
            documentId: createDocumentId("doc-1"),
            documentTitle: "Document 1",
            relevantContent: "Content 1",
            score: createSimilarityScore(0.95),
          },
          {
            documentId: createDocumentId("doc-2"),
            documentTitle: "Document 2",
            relevantContent: "Content 2",
            score: createSimilarityScore(0.85),
          },
          {
            documentId: createDocumentId("doc-3"),
            documentTitle: "Document 3",
            relevantContent: "Content 3",
            score: createSimilarityScore(0.75),
          },
        ],
      };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);

      expect(result.answer.sources).toHaveLength(3);
    });

    it("回答にソース情報が正しく含まれる", async () => {
      const queryResult = createTestQueryResult("回答テキスト");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);

      expect(result.answer.sources[0]).toMatchObject({
        documentId: "doc-1",
        documentTitle: "Test Document 1",
        relevantContent: "Relevant content 1",
      });
    });

    it("長文の回答が分割して送信される", async () => {
      const longAnswer = "A".repeat(6000);
      const queryResult = createTestQueryResult(longAnswer);
      const replySpy = vi.spyOn(container.messageSender, "reply");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      await answerQuestion(container, input);

      expect(replySpy).toHaveBeenCalledTimes(1);
      const call = replySpy.mock.calls[0][0];
      expect(call.messages.length).toBeGreaterThan(1);
    });

    it("デフォルトのtopK=5で検索される", async () => {
      const queryResult = createTestQueryResult("テスト回答");
      const defaultInput = {
        replyToken: "test-reply-token" as ReplyToken,
        questionText: "テスト質問",
      };
      const querySpy = vi.spyOn(container.queryEngine, "query");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      querySpy.mockResolvedValue(queryResult);

      await answerQuestion(container, defaultInput);

      expect(querySpy).toHaveBeenCalledWith("テスト質問", 5);
    });

    it("カスタムのtopK値で検索される", async () => {
      const queryResult = createTestQueryResult("テスト回答");
      const customInput = { ...input, topK: 10 };
      const querySpy = vi.spyOn(container.queryEngine, "query");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      querySpy.mockResolvedValue(queryResult);

      await answerQuestion(container, customInput);

      expect(querySpy).toHaveBeenCalledWith("テスト質問", 10);
    });
  });

  describe("異常系", () => {
    it("インデックス未構築時に適切なメッセージが返される", async () => {
      const notifySpy = vi.spyOn(container.userNotifier, "notifyIndexNotBuilt");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: false,
      });

      const result = await answerQuestion(container, input);

      expect(result.answer.content).toContain(
        "インデックスが構築されていません",
      );
      expect(notifySpy).toHaveBeenCalledWith(input.replyToken);
    });

    it("関連ドキュメントが見つからない場合に適切なメッセージが返される", async () => {
      const emptyQueryResult: QueryResult = {
        answer: "",
        sources: [],
      };
      const notifySpy = vi.spyOn(
        container.userNotifier,
        "notifyNoRelevantDocuments",
      );

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(
        emptyQueryResult,
      );

      const result = await answerQuestion(container, input);

      expect(result.answer.content).toContain(
        "該当する情報が見つかりませんでした",
      );
      expect(notifySpy).toHaveBeenCalledWith(input.replyToken);
    });

    it("ベクトル検索でエラーが発生した場合に例外がスローされる", async () => {
      const error = new SystemError("NETWORK_ERROR", "Search failed");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockRejectedValue(error);

      await expect(answerQuestion(container, input)).rejects.toThrow(error);
    });

    it("返信送信でエラーが発生した場合に例外がスローされる", async () => {
      const queryResult = createTestQueryResult("テスト回答");
      const error = new SystemError("NETWORK_ERROR", "Send failed");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);
      vi.spyOn(container.messageSender, "reply").mockRejectedValue(error);

      await expect(answerQuestion(container, input)).rejects.toThrow(error);
    });

    it("空の質問でBusinessRuleErrorが発生する", async () => {
      const emptyInput = { ...input, questionText: "" };

      await expect(answerQuestion(container, emptyInput)).rejects.toThrow(
        BusinessRuleError,
      );
    });

    it("空白のみの質問でBusinessRuleErrorが発生する", async () => {
      const whitespaceInput = { ...input, questionText: "   " };

      await expect(answerQuestion(container, whitespaceInput)).rejects.toThrow(
        BusinessRuleError,
      );
    });
  });

  describe("境界値", () => {
    it("topK=1で1件のドキュメントのみ取得される", async () => {
      const singleResult: QueryResult = {
        answer: "単一回答",
        sources: [
          {
            documentId: createDocumentId("doc-1"),
            documentTitle: "Document 1",
            relevantContent: "Content 1",
            score: createSimilarityScore(0.95),
          },
        ],
      };
      const querySpy = vi.spyOn(container.queryEngine, "query");
      const singleInput = { ...input, topK: 1 };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      querySpy.mockResolvedValue(singleResult);

      const result = await answerQuestion(container, singleInput);

      expect(querySpy).toHaveBeenCalledWith("テスト質問", 1);
      expect(result.answer.sources).toHaveLength(1);
    });

    it("検索結果がtopKより少ない場合に利用可能な件数のみ取得される", async () => {
      const partialResult: QueryResult = {
        answer: "部分回答",
        sources: [
          {
            documentId: createDocumentId("doc-1"),
            documentTitle: "Document 1",
            relevantContent: "Content 1",
            score: createSimilarityScore(0.95),
          },
        ],
      };
      const largeTopKInput = { ...input, topK: 100 };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(partialResult);

      const result = await answerQuestion(container, largeTopKInput);

      expect(result.answer.sources).toHaveLength(1);
    });

    it("質問が非常に長い場合でも処理される", async () => {
      const longQuestion = "質問".repeat(1000);
      const queryResult = createTestQueryResult("回答");
      const longInput = { ...input, questionText: longQuestion };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, longInput);

      expect(result.answer.question).toBe(longQuestion);
    });

    it("回答が5000文字を超える場合に正しく分割される", async () => {
      const longAnswer = "A".repeat(5500);
      const queryResult = createTestQueryResult(longAnswer);
      const replySpy = vi.spyOn(container.messageSender, "reply");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      await answerQuestion(container, input);

      const call = replySpy.mock.calls[0][0];
      expect(call.messages.length).toBeGreaterThan(1);
    });

    it("インデックスにエントリが1件のみの場合に検索できる", async () => {
      const singleResult: QueryResult = {
        answer: "回答",
        sources: [
          {
            documentId: createDocumentId("doc-1"),
            documentTitle: "Document 1",
            relevantContent: "Content 1",
            score: createSimilarityScore(0.95),
          },
        ],
      };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(singleResult);

      const result = await answerQuestion(container, input);

      expect(result.answer.sources).toHaveLength(1);
    });
  });

  describe("データ検証", () => {
    it("類似度スコアが正しく含まれる", async () => {
      const queryResult: QueryResult = {
        answer: "回答",
        sources: [
          {
            documentId: createDocumentId("doc-1"),
            documentTitle: "Document 1",
            relevantContent: "Content 1",
            score: createSimilarityScore(0.95),
          },
        ],
      };

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);

      expect(result.answer.sources[0].score).toBe(0.95);
    });

    it("ドキュメントIDが正しく含まれる", async () => {
      const queryResult = createTestQueryResult("回答");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);

      expect(result.answer.sources[0].documentId).toBe("doc-1");
      expect(result.answer.sources[1].documentId).toBe("doc-2");
    });

    it("ドキュメントタイトルが正しく含まれる", async () => {
      const queryResult = createTestQueryResult("回答");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);

      expect(result.answer.sources[0].documentTitle).toBe("Test Document 1");
      expect(result.answer.sources[1].documentTitle).toBe("Test Document 2");
    });

    it("Questionの値オブジェクトが正しく生成される", async () => {
      const queryResult = createTestQueryResult("回答");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);

      expect(result.answer.question).toBe("テスト質問");
    });

    it("AnswerIdがUUIDv7形式で生成される", async () => {
      const queryResult = createTestQueryResult("回答");

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);

      // UUIDv7の形式をチェック（ハイフンで区切られた5つのグループ）
      expect(result.answer.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("generatedAtが現在時刻で設定される", async () => {
      const queryResult = createTestQueryResult("回答");
      const beforeTime = new Date();

      vi.spyOn(container.indexBuilder, "getStatus").mockResolvedValue({
        isAvailable: true,
      });
      vi.spyOn(container.queryEngine, "query").mockResolvedValue(queryResult);

      const result = await answerQuestion(container, input);
      const afterTime = new Date();

      expect(result.answer.generatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(result.answer.generatedAt.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });
  });
});
