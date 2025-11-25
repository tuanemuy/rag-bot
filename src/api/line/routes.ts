import { Hono } from "hono";
import type { Container } from "@/core/application/container";
import { answerQuestion } from "@/core/application/qa/answerQuestion";
import { checkStatus } from "@/core/application/status/checkStatus";
import { syncDocuments } from "@/core/application/sync/syncDocuments";
import {
  createEventSource,
  createReplyToken,
} from "@/core/domain/message/valueObject";
import { type LineHonoEnv, verifyLineSignature } from "./middleware";
import type { MessageEvent, WebhookEvent } from "./schema";

/**
 * コマンドタイプ
 */
type CommandType = "sync" | "status" | "question" | "message";

/**
 * テキストメッセージをコマンドタイプに分類する
 */
function parseCommand(text: string): CommandType {
  const trimmed = text.trim();
  const lowerTrimmed = trimmed.toLowerCase();

  if (lowerTrimmed === "sync") {
    return "sync";
  }
  if (lowerTrimmed === "status") {
    return "status";
  }
  if (trimmed.startsWith("query:") || trimmed.startsWith("Query:")) {
    return "question";
  }
  return "message";
}

/**
 * "query:" プレフィックスを除去して質問テキストを抽出する
 */
function extractQuestionText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("query:")) {
    return trimmed.slice(6).trim();
  }
  if (trimmed.startsWith("Query:")) {
    return trimmed.slice(6).trim();
  }
  return trimmed;
}

export const lineRoutes = new Hono<LineHonoEnv>();

// LINE Webhook endpoint
lineRoutes.post("/webhook", verifyLineSignature(), async (c) => {
  const container = c.get("container");
  const { events } = c.get("webhookBody");

  // Process events
  const results = await Promise.allSettled(
    events.map((event) => processEvent(container, event)),
  );

  // Log any failed events
  for (const result of results) {
    if (result.status === "rejected") {
      container.logger.error("Failed to process webhook event", result.reason);
    }
  }

  return c.json({ success: true });
});

async function processEvent(
  container: Container,
  event: WebhookEvent,
): Promise<void> {
  switch (event.type) {
    case "message":
      await handleMessageEvent(container, event);
      break;
    case "follow":
      container.logger.info("Follow event received", { source: event.source });
      break;
    case "unfollow":
      container.logger.info("Unfollow event received", {
        source: event.source,
      });
      break;
    case "join":
      container.logger.info("Join event received", { source: event.source });
      break;
    case "leave":
      container.logger.info("Leave event received", { source: event.source });
      break;
    case "postback":
      container.logger.info("Postback event received", {
        source: event.source,
        data: event.postback.data,
      });
      break;
    default:
      container.logger.warn("Unknown event type", { event });
  }
}

async function handleMessageEvent(
  container: Container,
  event: MessageEvent,
): Promise<void> {
  const { message, replyToken, source } = event;

  // Only handle text messages
  if (message.type !== "text") {
    container.logger.info("Non-text message received, ignoring", {
      messageType: message.type,
    });
    return;
  }

  const commandType = parseCommand(message.text);

  switch (commandType) {
    case "sync": {
      // sync コマンド: バックグラウンドで実行
      // EventSourceを作成
      const eventSource = createEventSource({
        type: source.type,
        userId: "userId" in source ? source.userId : undefined,
        groupId: "groupId" in source ? source.groupId : undefined,
        roomId: "roomId" in source ? source.roomId : undefined,
      });

      // バックグラウンドで同期を実行（awaitしない）
      syncDocuments(container, {
        replyToken: createReplyToken(replyToken),
        eventSource,
      }).catch((error) => {
        container.logger.error("Background sync failed", error);
      });
      break;
    }

    case "status": {
      // status コマンド: ステータスを確認して返信
      await checkStatus(container, {
        replyToken: createReplyToken(replyToken),
      });
      break;
    }

    case "question": {
      // 質問: RAGで回答を生成して返信
      const questionText = extractQuestionText(message.text);
      await answerQuestion(container, {
        replyToken: createReplyToken(replyToken),
        questionText,
        topK: 5,
      });
      break;
    }

    case "message": {
      // 通常のメッセージ: ログのみ
      container.logger.info("Regular message received, ignoring", {
        text: message.text,
        source,
      });
      break;
    }
  }
}
