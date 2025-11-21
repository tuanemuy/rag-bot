import type { RetrievalContext } from "../entity";
import type { AnswerContent } from "../valueObject";

export interface AnswerGenerator {
  /**
   * コンテキストと質問から回答を生成する
   * @throws SystemError - LLM API呼び出しに失敗した場合
   */
  generate(context: RetrievalContext): Promise<AnswerContent>;
}
