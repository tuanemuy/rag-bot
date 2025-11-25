import type { SyncResult } from "@/core/domain/document/entity";
import type { UserNotifier } from "@/core/domain/message/ports/userNotifier";
import { splitLongMessage } from "@/core/domain/message/services/splitLongMessage";
import {
  createTextMessageContent,
  type ReplyToken,
} from "@/core/domain/message/valueObject";
import type { IndexStatus } from "@/core/domain/vectorIndex/valueObject";
import type { LineApiClient } from "./lineApiClient";
import {
  createBuildResultMessage,
  createStatusMessage,
  createSyncErrorMessage,
  type MessageTemplates,
} from "./messages/ja";

/**
 * LINE用UserNotifierアダプター
 *
 * テンプレートベースの定型通知を担当する
 */
export class LineUserNotifier implements UserNotifier {
  constructor(
    private readonly client: LineApiClient,
    private readonly messages: MessageTemplates,
  ) {}

  async notifySyncStarting(replyToken: ReplyToken): Promise<void> {
    await this.client.reply(replyToken as string, [
      createTextMessageContent(this.messages.sync.syncStarting),
    ]);
  }

  async notifySyncCompleted(
    destination: string,
    syncResult: SyncResult,
    buildResult: { totalEntries: number; buildDuration: number },
  ): Promise<void> {
    const message = createBuildResultMessage(syncResult, buildResult);
    const chunks = splitLongMessage(message);
    await this.client.push(
      destination,
      chunks.map((text) => createTextMessageContent(text)),
    );
  }

  async notifyNoDocumentsFound(destination: string): Promise<void> {
    await this.client.push(destination, [
      createTextMessageContent(this.messages.sync.noDocumentsFound),
    ]);
  }

  async notifySyncError(
    destination: string,
    error: { type: "not_found" | "system" | "unknown"; message: string },
  ): Promise<void> {
    const message = createSyncErrorMessage(error, this.messages.sync);
    await this.client.push(destination, [createTextMessageContent(message)]);
  }

  async notifyIndexNotBuilt(replyToken: ReplyToken): Promise<void> {
    await this.client.reply(replyToken as string, [
      createTextMessageContent(this.messages.qa.indexNotBuilt),
    ]);
  }

  async notifyNoRelevantDocuments(replyToken: ReplyToken): Promise<void> {
    await this.client.reply(replyToken as string, [
      createTextMessageContent(this.messages.qa.noRelevantDocuments),
    ]);
  }

  async notifyStatus(
    replyToken: ReplyToken,
    status: IndexStatus,
  ): Promise<void> {
    const message = createStatusMessage(status, this.messages.status);
    const chunks = splitLongMessage(message);
    await this.client.reply(
      replyToken as string,
      chunks.map((text) => createTextMessageContent(text)),
    );
  }
}
