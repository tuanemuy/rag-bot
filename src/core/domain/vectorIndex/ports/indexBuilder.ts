import type {
  IndexBuildResult,
  IndexDocument,
  IndexStatus,
} from "../valueObject";

/**
 * インデックスの構築・管理を担当するポート
 */
export interface IndexBuilder {
  /**
   * ドキュメントからインデックスを構築する
   * 既存のインデックスは全て削除され、新しいインデックスで置き換えられる
   * @param documents - インデックス対象のドキュメント
   * @returns インデックス構築の結果
   * @throws SystemError - インデックス構築に失敗した場合
   */
  buildIndex(documents: IndexDocument[]): Promise<IndexBuildResult>;

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
