import type { SyncResult } from "@/core/domain/document/entity";
import type { IndexStatus } from "@/core/domain/vectorIndex/valueObject";

/**
 * 同期関連メッセージテンプレート
 */
export const syncMessages = {
  syncStarting: "ドキュメントの同期を開始します。",
  noDocumentsFound: "同期対象のドキュメントが見つかりませんでした。",
  systemError:
    "システムエラーが発生しました。しばらく時間をおいて再度お試しください。",
} as const;

/**
 * QA関連メッセージテンプレート
 */
export const qaMessages = {
  indexNotBuilt:
    "インデックスが構築されていません。先にsyncコマンドを実行してください。",
  noRelevantDocuments:
    "該当する情報が見つかりませんでした。質問を変えてお試しください。",
} as const;

/**
 * ステータス関連メッセージテンプレート
 */
export const statusMessages = {
  available: "インデックス状態: 利用可能",
  notAvailable: "インデックス状態: 利用不可（syncコマンドを実行してください）",
} as const;

/**
 * メッセージテンプレート型
 */
export type MessageTemplates = {
  sync: typeof syncMessages;
  qa: typeof qaMessages;
  status: typeof statusMessages;
};

/**
 * 日本語メッセージテンプレート
 */
export const jaMessages: MessageTemplates = {
  sync: syncMessages,
  qa: qaMessages,
  status: statusMessages,
};

/**
 * SyncResultからユーザー通知用メッセージを生成する
 */
export function createSyncResultMessage(result: SyncResult): string {
  if (result.failedCount === 0) {
    return `同期が完了しました。${result.successCount}件のドキュメントを取得しました。`;
  }
  if (result.successCount === 0) {
    return `同期に失敗しました。全${result.totalCount}件のドキュメント取得に失敗しました。`;
  }
  return (
    "同期が部分的に完了しました。\n" +
    `成功: ${result.successCount}件\n` +
    `失敗: ${result.failedCount}件\n` +
    `失敗したドキュメントID: ${result.failedIds.slice(0, 5).join(", ")}` +
    (result.failedIds.length > 5 ? ` 他${result.failedIds.length - 5}件` : "")
  );
}

/**
 * インデックス構築結果からユーザー通知用メッセージを生成する
 */
export function createBuildResultMessage(
  syncResult: SyncResult,
  buildResult: { totalEntries: number; buildDuration: number },
): string {
  const baseMessage = createSyncResultMessage(syncResult);
  const indexMessage = `インデックス構築完了: ${buildResult.totalEntries}件のエントリを作成（${Math.round(buildResult.buildDuration / 1000)}秒）`;
  return `${baseMessage}\n\n${indexMessage}`;
}

/**
 * 同期エラーメッセージを生成する
 */
export function createSyncErrorMessage(
  error: { type: "not_found" | "system" | "unknown"; message: string },
  templates: typeof syncMessages,
): string {
  switch (error.type) {
    case "not_found":
      return `同期に失敗しました: ${error.message}`;
    case "system":
      return templates.systemError;
    case "unknown":
      return `同期中にエラーが発生しました: ${error.message}`;
  }
}

/**
 * ステータスメッセージを生成する
 */
export function createStatusMessage(
  status: IndexStatus,
  templates: typeof statusMessages,
): string {
  if (status.isAvailable) {
    return templates.available;
  }
  return templates.notAvailable;
}
