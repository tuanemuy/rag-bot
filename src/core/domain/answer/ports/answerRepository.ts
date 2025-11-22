import type { Answer } from "../entity";

export interface AnswerRepository {
  /**
   * 回答を保存する
   * @throws SystemError - 保存に失敗した場合
   */
  save(answer: Answer): Promise<void>;

  /**
   * 回答履歴を取得する
   */
  findRecent(limit: number): Promise<Answer[]>;

  /**
   * 指定期間の回答を取得する（分析用）
   * @param from - 開始日時
   * @param to - 終了日時
   * @param options - ページネーションオプション
   * @returns 回答のリストと総件数
   */
  findByDateRange(
    from: Date,
    to: Date,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: Answer[]; total: number }>;
}
