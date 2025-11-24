import type { QueryResult } from "../valueObject";

/**
 * 検索と回答生成を担当するポート
 */
export interface QueryEngine {
  /**
   * 質問に対して検索と回答生成を実行する
   * @param question - ユーザーの質問
   * @param topK - 取得する類似ドキュメント数
   * @returns クエリ結果（回答と参照ソース）
   * @throws NotFoundError - インデックスが利用不可の場合
   * @throws SystemError - 検索または回答生成に失敗した場合
   */
  query(question: string, topK: number): Promise<QueryResult>;
}
