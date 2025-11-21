import { BusinessRuleError } from "@/core/domain/error";
import type { DocumentId } from "@/core/domain/shared";
import { DocumentErrorCode } from "./errorCode";
import type {
  DocumentContent,
  DocumentFormat,
  DocumentMetadata,
  DocumentTitle,
  DocumentUrl,
} from "./valueObject";

export type Document = Readonly<{
  id: DocumentId;
  title: DocumentTitle;
  content: DocumentContent;
  metadata: DocumentMetadata;
  fetchedAt: Date;
}>;

export function createDocument(params: {
  id: DocumentId;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  fetchedAt: Date;
}): Document {
  if (!params.content || params.content.trim() === "") {
    throw new BusinessRuleError(
      DocumentErrorCode.EmptyContent,
      "Document content cannot be empty",
    );
  }
  return {
    id: params.id,
    title: params.title as DocumentTitle,
    content: params.content as DocumentContent,
    metadata: params.metadata,
    fetchedAt: params.fetchedAt,
  };
}

export type DocumentListItem = Readonly<{
  id: DocumentId;
  url: DocumentUrl;
}>;

export type RawDocument = Readonly<{
  id: DocumentId;
  format: DocumentFormat;
  data: string;
}>;

export type SyncResult = Readonly<{
  totalCount: number;
  successCount: number;
  failedCount: number;
  failedIds: DocumentId[];
}>;

export function createSyncResult(
  results: Array<{ id: DocumentId; success: boolean }>,
): SyncResult {
  const failedIds = results.filter((r) => !r.success).map((r) => r.id);
  return {
    totalCount: results.length,
    successCount: results.length - failedIds.length,
    failedCount: failedIds.length,
    failedIds,
  };
}

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
