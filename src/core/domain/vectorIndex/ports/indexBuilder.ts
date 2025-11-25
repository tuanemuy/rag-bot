import type {
  IndexBuildResult,
  IndexDocument,
  IndexStatus,
} from "../valueObject";

/**
 * インデックスの構築・管理を担当するポート
 * バッチ処理を前提とした設計
 */
export interface IndexBuilder {
  /**
   * ドキュメントをインデックスに追加する
   * 既存のインデックスを保持したまま、新しいドキュメントを追加する
   * @param documents - インデックスに追加するドキュメント
   * @returns インデックス構築の結果
   * @throws SystemError - ドキュメント追加に失敗した場合
   */
  addDocuments(documents: IndexDocument[]): Promise<IndexBuildResult>;

  /**
   * インデックスをクリアする
   * @throws SystemError - クリアに失敗した場合
   */
  clearIndex(): Promise<void>;

  /**
   * インデックスの状態を取得する
   * @returns インデックスの状態
   * @throws SystemError - 状態取得に失敗した場合
   */
  getStatus(): Promise<IndexStatus>;
}
