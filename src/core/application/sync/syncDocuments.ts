import { isNotFoundError, isSystemError } from "@/core/application/error";
import type { Document, SyncResult } from "@/core/domain/document/entity";
import { toIndexDocument } from "@/core/domain/document/entity";
import {
  type EventSource,
  getEventSourceDestination,
  type ReplyToken,
} from "@/core/domain/message/valueObject";
import { batchIterate } from "@/lib/iterator";
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
  await container.userNotifier.notifySyncStarting(replyToken);

  const destination = getEventSourceDestination(eventSource);

  try {
    // 2. インデックスをクリアする（フェーズ1）
    await container.indexBuilder.clearIndex();

    // 3. バッチ単位でドキュメントを取得・インデックス追加（フェーズ2）
    let successCount = 0;
    let totalEntries = 0;
    const startTime = Date.now();

    for await (const batch of batchIterate<Document>(
      container.documentSource.iterate(),
      container.config.syncBatchSize,
    )) {
      container.logger.info(`Indexing batch of ${batch.length} documents...`);
      successCount += batch.length;
      const indexDocuments = batch.map(toIndexDocument);
      const batchResult =
        await container.indexBuilder.addDocuments(indexDocuments);
      totalEntries += batchResult.totalEntries;
      container.logger.info("Success.", {
        destination,
        batchEntries: batchResult.totalEntries,
      });
      container.logger.info(`Indexed ${successCount} documents so far...`);
    }

    const buildDuration = Date.now() - startTime;

    if (successCount === 0) {
      // ドキュメントがない場合
      await container.userNotifier.notifyNoDocumentsFound(destination);
      return {
        totalDocuments: 0,
        successCount: 0,
        failedCount: 0,
        totalEntries: 0,
        buildDuration: 0,
      };
    }

    const syncResult: SyncResult = {
      totalCount: successCount,
      successCount,
      failedCount: 0,
      failedIds: [],
    };

    const buildResult = {
      totalEntries,
      buildDuration,
    };

    // 4. 同期完了メッセージを送信する（Push）
    await container.userNotifier.notifySyncCompleted(
      destination,
      syncResult,
      buildResult,
    );

    return {
      totalDocuments: syncResult.totalCount,
      successCount: syncResult.successCount,
      failedCount: syncResult.failedCount,
      totalEntries: buildResult.totalEntries,
      buildDuration: buildResult.buildDuration,
    };
  } catch (error) {
    // エラータイプに応じた通知
    if (isNotFoundError(error)) {
      container.logger.warn("Sync failed due to NotFoundError", {
        destination,
        code: error.code,
        error: error.message,
      });
      await container.userNotifier.notifySyncError(destination, {
        type: "not_found",
        message: error.message,
      });
    } else if (isSystemError(error)) {
      container.logger.error("Sync failed due to SystemError", error, {
        destination,
        code: error.code,
      });
      await container.userNotifier.notifySyncError(destination, {
        type: "system",
        message: error.message,
      });
    } else {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      container.logger.error("Sync failed due to unexpected error", error, {
        destination,
      });
      await container.userNotifier.notifySyncError(destination, {
        type: "unknown",
        message: errorMessage,
      });
    }

    throw error;
  }
}
