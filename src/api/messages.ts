import type { SyncResult } from "@/core/domain/document/entity";

/**
 * ユーザー向けメッセージ定義
 *
 * 多言語対応が必要な場合は、このファイルを拡張して
 * ロケールに応じたメッセージを返すように修正する
 */

// QA関連メッセージ
export const qaMessages = {
  noRelevantDocuments:
    "該当する情報が見つかりませんでした。質問を変えてお試しください。",
  indexNotBuilt:
    "インデックスが構築されていません。先にsyncコマンドを実行してください。",
} as const;

// 同期関連メッセージ
export const syncMessages = {
  syncStarting: "ドキュメントの同期を開始します...",
  noDocumentsFound: "同期対象のドキュメントが見つかりませんでした。",
  systemError:
    "システムエラーが発生しました。しばらく時間をおいて再度お試しください。",
} as const;

/**
 * SyncResultからユーザー通知用メッセージを生成する
 */
export function createSyncResultMessage(result: SyncResult): string {
  if (result.failedCount === 0) {
    // 全件成功
    return `同期が完了しました。${result.successCount}件のドキュメントを取得しました。`;
  }
  if (result.successCount === 0) {
    // 全件失敗
    return `同期に失敗しました。全${result.totalCount}件のドキュメント取得に失敗しました。`;
  }
  // 部分的成功
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
export function createSyncErrorMessage(errorMessage: string): string {
  return `同期中にエラーが発生しました: ${errorMessage}`;
}

/**
 * NotFoundエラーメッセージを生成する
 */
export function createNotFoundErrorMessage(message: string): string {
  return `同期に失敗しました: ${message}`;
}
