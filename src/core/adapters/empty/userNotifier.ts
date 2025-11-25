import type { SyncResult } from "@/core/domain/document/entity";
import type { UserNotifier } from "@/core/domain/message/ports/userNotifier";
import type { ReplyToken } from "@/core/domain/message/valueObject";
import type { IndexStatus } from "@/core/domain/vectorIndex/valueObject";

export class EmptyUserNotifier implements UserNotifier {
  async notifySyncStarting(_replyToken: ReplyToken): Promise<void> {
    // No-op
  }

  async notifySyncCompleted(
    _destination: string,
    _syncResult: SyncResult,
    _buildResult: { totalEntries: number; buildDuration: number },
  ): Promise<void> {
    // No-op
  }

  async notifyNoDocumentsFound(_destination: string): Promise<void> {
    // No-op
  }

  async notifySyncError(
    _destination: string,
    _error: { type: "not_found" | "system" | "unknown"; message: string },
  ): Promise<void> {
    // No-op
  }

  async notifyIndexNotBuilt(_replyToken: ReplyToken): Promise<void> {
    // No-op
  }

  async notifyNoRelevantDocuments(_replyToken: ReplyToken): Promise<void> {
    // No-op
  }

  async notifyStatus(
    _replyToken: ReplyToken,
    _status: IndexStatus,
  ): Promise<void> {
    // No-op
  }
}
