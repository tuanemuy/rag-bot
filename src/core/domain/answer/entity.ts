import { BusinessRuleError } from "@/core/domain/error";
import type { DocumentId, SimilarityScore } from "@/core/domain/shared";
import { AnswerErrorCode } from "./errorCode";
import type {
  AnswerContent,
  AnswerId,
  AnswerSourceId,
  Question,
} from "./valueObject";

export type AnswerSource = Readonly<{
  id: AnswerSourceId;
  documentId: DocumentId;
  documentTitle: string;
  relevantContent: string;
  score: SimilarityScore;
}>;

export type Answer = Readonly<{
  id: AnswerId;
  question: Question;
  content: AnswerContent;
  sources: AnswerSource[];
  generatedAt: Date;
}>;

export function createAnswer(params: {
  id: AnswerId;
  question: Question;
  content: AnswerContent;
  sources: AnswerSource[];
  generatedAt: Date;
}): Answer {
  // 空の質問をチェック
  if (!params.question || (params.question as string).trim() === "") {
    throw new BusinessRuleError(
      AnswerErrorCode.EmptyQuestion,
      "Question cannot be empty",
    );
  }
  // 空の回答内容をチェック
  if (!params.content || (params.content as string).trim() === "") {
    throw new BusinessRuleError(
      AnswerErrorCode.EmptyContent,
      "Answer content cannot be empty",
    );
  }
  return params;
}

export type RetrievedDocument = Readonly<{
  documentId: DocumentId;
  title: string;
  content: string;
  score: SimilarityScore;
}>;

export type RetrievalContext = Readonly<{
  query: Question;
  retrievedDocuments: RetrievedDocument[];
}>;

export function createAnswerFromContext(
  id: AnswerId,
  content: AnswerContent,
  context: RetrievalContext,
  generatedAt: Date,
): Answer {
  const sources = context.retrievedDocuments.map((doc, index) => ({
    id: `${id}-source-${index}` as AnswerSourceId,
    documentId: doc.documentId,
    documentTitle: doc.title,
    relevantContent: doc.content,
    score: doc.score,
  }));
  return {
    id,
    question: context.query,
    content,
    sources,
    generatedAt,
  };
}

export function createNoRelevantDocumentsAnswer(
  id: AnswerId,
  question: Question,
): Answer {
  return {
    id,
    question,
    content:
      "該当する情報が見つかりませんでした。質問を変えてお試しください。" as AnswerContent,
    sources: [],
    generatedAt: new Date(),
  };
}

export function createIndexNotBuiltAnswer(
  id: AnswerId,
  question: Question,
): Answer {
  return {
    id,
    question,
    content:
      "インデックスが構築されていません。先にsyncコマンドを実行してください。" as AnswerContent,
    sources: [],
    generatedAt: new Date(),
  };
}
