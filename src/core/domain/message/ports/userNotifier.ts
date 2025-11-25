import type { SyncResult } from "@/core/domain/document/entity";
import type { IndexStatus } from "@/core/domain/vectorIndex/valueObject";
import type { ReplyToken } from "../valueObject";

/**
 * テンプレートベースの定型通知インターフェース
 * メッセージ文言はアダプター層で管理する
 */
export interface UserNotifier {
  // === 同期関連通知 ===

  /**
   * 同期開始を通知する（Reply API使用）
   * @param replyToken - 返信用トークン
   */
  notifySyncStarting(replyToken: ReplyToken): Promise<void>;

  /**
   * 同期完了を通知する（Push API使用）
   * @param destination - 送信先ID
   * @param syncResult - 同期結果
   * @param buildResult - インデックス構築結果
   */
  notifySyncCompleted(
    destination: string,
    syncResult: SyncResult,
    buildResult: { totalEntries: number; buildDuration: number },
  ): Promise<void>;

  /**
   * ドキュメントが見つからなかったことを通知する（Push API使用）
   * @param destination - 送信先ID
   */
  notifyNoDocumentsFound(destination: string): Promise<void>;

  /**
   * 同期エラーを通知する（Push API使用）
   * @param destination - 送信先ID
   * @param error - エラー情報
   */
  notifySyncError(
    destination: string,
    error: { type: "not_found" | "system" | "unknown"; message: string },
  ): Promise<void>;

  // === QA関連通知 ===

  /**
   * インデックス未構築を通知する（Reply API使用）
   * @param replyToken - 返信用トークン
   */
  notifyIndexNotBuilt(replyToken: ReplyToken): Promise<void>;

  /**
   * 関連ドキュメントがないことを通知する（Reply API使用）
   * @param replyToken - 返信用トークン
   */
  notifyNoRelevantDocuments(replyToken: ReplyToken): Promise<void>;

  // === ステータス関連通知 ===

  /**
   * インデックスステータスを通知する（Reply API使用）
   * @param replyToken - 返信用トークン
   * @param status - インデックスステータス
   */
  notifyStatus(replyToken: ReplyToken, status: IndexStatus): Promise<void>;
}
