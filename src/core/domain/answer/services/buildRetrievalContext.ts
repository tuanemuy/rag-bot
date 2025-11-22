import type { DocumentId, SimilarityScore } from "@/core/domain/shared";
import type { RetrievalContext } from "../entity";
import type { Question } from "../valueObject";

/**
 * SearchResultInputはAnswerドメインで定義する入力型
 */
export type SearchResultInput = Readonly<{
  entry: {
    documentId: DocumentId;
    documentTitle: string;
    content: string;
  };
  score: SimilarityScore;
}>;

/**
 * 検索結果からRetrievalContextを構築する
 * 純粋関数として実装（外部依存なし）
 */
export function buildRetrievalContext(
  question: Question,
  searchResults: SearchResultInput[],
): RetrievalContext {
  const retrievedDocuments = searchResults.map((result) => ({
    documentId: result.entry.documentId,
    title: result.entry.documentTitle,
    content: result.entry.content,
    score: result.score,
  }));

  return {
    query: question,
    retrievedDocuments,
  };
}
