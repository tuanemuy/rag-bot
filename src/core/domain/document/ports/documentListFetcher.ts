import type { DocumentListItem } from "../entity";
import type { CursorPagination, OffsetPagination } from "../valueObject";

export interface DocumentListFetcher {
  /**
   * ドキュメント一覧を取得する（オフセットベース）
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @throws SystemError - 最大リトライ回数を超えてもAPI呼び出しに失敗した場合
   */
  fetchWithOffset(
    offset: number,
    limit: number,
  ): Promise<{
    items: DocumentListItem[];
    pagination: OffsetPagination;
  }>;

  /**
   * ドキュメント一覧を取得する（カーソルベース）
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @throws SystemError - 最大リトライ回数を超えてもAPI呼び出しに失敗した場合
   */
  fetchWithCursor(cursor: string | null): Promise<{
    items: DocumentListItem[];
    pagination: CursorPagination;
  }>;
}
