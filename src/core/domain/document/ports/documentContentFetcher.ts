import type { DocumentListItem, RawDocument } from "../entity";

export interface DocumentContentFetcher {
  /**
   * ドキュメント内容を取得する
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @param item - ドキュメントリストアイテム（id と url を含む）
   * @throws SystemError - 最大リトライ回数を超えてもAPI呼び出しに失敗した場合
   */
  fetch(item: DocumentListItem): Promise<RawDocument>;
}
