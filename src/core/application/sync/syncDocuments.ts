import {
  createBuildResultMessage,
  createNotFoundErrorMessage,
  createSyncErrorMessage,
  syncMessages,
} from "@/api/messages";
import { isNotFoundError, isSystemError } from "@/core/application/error";
import type { Document } from "@/core/domain/document/entity";
import {
  createSyncResult,
  toIndexDocument,
} from "@/core/domain/document/entity";
import { createReplyMessage } from "@/core/domain/message/entity";
import { splitLongMessage } from "@/core/domain/message/services/splitLongMessage";
import {
  createTextMessageContent,
  type EventSource,
  getEventSourceDestination,
  type ReplyToken,
} from "@/core/domain/message/valueObject";
import type { DocumentId } from "@/core/domain/shared";
import type { Container } from "../container";

/**
 * ドキュメント同期ユースケースの入力
 */
export type SyncDocumentsInput = {
  replyToken: ReplyToken;
  eventSource: EventSource;
};

/**
 * ドキュメント同期ユースケースの出力
 */
export type SyncDocumentsOutput = {
  totalDocuments: number;
  successCount: number;
  failedCount: number;
  totalEntries: number;
  buildDuration: number;
};

/**
 * UC-SYNC-001: ドキュメントを同期する
 *
 * 外部APIからドキュメントを取得し、インデックスを更新する
 */
export async function syncDocuments(
  container: Container,
  input: SyncDocumentsInput,
): Promise<SyncDocumentsOutput> {
  const { replyToken, eventSource } = input;

  // 1. 同期開始メッセージを返信する（Reply）
  const startMessage = createReplyMessage(replyToken, [
    createTextMessageContent(syncMessages.syncStarting),
  ]);
  await container.messageSender.reply(startMessage);

  const destination = getEventSourceDestination(eventSource);

  try {
    // 2. ドキュメントを取得する（DocumentSourceを使用）
    const documents: Document[] = [];
    const results: Array<{ id: DocumentId; success: boolean }> = [];

    for await (const doc of container.documentSource.iterate()) {
      documents.push(doc);
      results.push({ id: doc.id, success: true });
    }

    if (documents.length === 0) {
      // ドキュメントがない場合
      await container.messageSender.push(destination, [
        createTextMessageContent(syncMessages.noDocumentsFound),
      ]);
      return {
        totalDocuments: 0,
        successCount: 0,
        failedCount: 0,
        totalEntries: 0,
        buildDuration: 0,
      };
    }

    const syncResult = createSyncResult(results);

    // 3. ドキュメントを保存する（トランザクション）
    const indexDocuments = documents.map(toIndexDocument);

    await container.unitOfWork.runInTx(async (repositories) => {
      // 3.1 既存ドキュメントを全削除
      await repositories.documentRepository.deleteAll();

      // 3.2 新規ドキュメントを保存
      await repositories.documentRepository.saveMany(documents);
    });

    // 4. インデックスを構築する（トランザクション外）
    // 外部API呼び出しを含むため、トランザクションの長時間化を避ける
    // 失敗した場合、ドキュメントは保存済みだが次回同期で再構築される
    const buildResult = await container.indexBuilder.buildIndex(indexDocuments);

    // 5. 同期完了メッセージを送信する（Push）
    const completionMessage = createBuildResultMessage(syncResult, {
      totalEntries: buildResult.totalEntries,
      buildDuration: buildResult.buildDuration,
    });

    const messageChunks = splitLongMessage(completionMessage);
    await container.messageSender.push(
      destination,
      messageChunks.map((text) => createTextMessageContent(text)),
    );

    return {
      totalDocuments: syncResult.totalCount,
      successCount: syncResult.successCount,
      failedCount: syncResult.failedCount,
      totalEntries: buildResult.totalEntries,
      buildDuration: buildResult.buildDuration,
    };
  } catch (error) {
    // エラータイプに応じたメッセージを生成
    let userMessage: string;
    if (isNotFoundError(error)) {
      userMessage = createNotFoundErrorMessage(error.message);
      container.logger.warn("Sync failed due to NotFoundError", {
        destination,
        code: error.code,
        error: error.message,
      });
    } else if (isSystemError(error)) {
      userMessage = syncMessages.systemError;
      container.logger.error("Sync failed due to SystemError", error, {
        destination,
        code: error.code,
      });
    } else {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      userMessage = createSyncErrorMessage(errorMessage);
      container.logger.error("Sync failed due to unexpected error", error, {
        destination,
      });
    }

    // エラーメッセージを送信
    try {
      await container.messageSender.push(destination, [
        createTextMessageContent(userMessage),
      ]);
    } catch (pushError) {
      // Push通知失敗はログに記録し、処理を継続
      container.logger.error("Failed to send error notification", pushError, {
        destination,
        originalError: userMessage,
      });
    }
    throw error;
  }
}
