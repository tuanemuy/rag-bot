import { v7 as uuidv7 } from "uuid";
import { BusinessRuleError } from "@/core/domain/error";
import type { DocumentId, SimilarityScore } from "@/core/domain/shared";
import { VectorIndexErrorCode } from "./errorCode";

export type { DocumentId, SimilarityScore } from "@/core/domain/shared";
export { createDocumentId, createSimilarityScore } from "@/core/domain/shared";

// Answer関連の値オブジェクト

export type AnswerId = string & { readonly brand: "AnswerId" };

export function createAnswerId(value: string): AnswerId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidAnswerId,
      "AnswerId cannot be empty",
    );
  }
  return value as AnswerId;
}

export function generateAnswerId(): AnswerId {
  return uuidv7() as AnswerId;
}

export type AnswerSourceId = string & { readonly brand: "AnswerSourceId" };

export function generateAnswerSourceId(
  answerId: AnswerId,
  index: number,
): AnswerSourceId {
  return `${answerId}-source-${index}` as AnswerSourceId;
}

export type Question = string & { readonly brand: "Question" };

export function createQuestion(value: string): Question {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      VectorIndexErrorCode.EmptyQuestion,
      "Question cannot be empty",
    );
  }
  return value as Question;
}

export type AnswerContent = string & { readonly brand: "AnswerContent" };

export function createAnswerContent(value: string): AnswerContent {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      VectorIndexErrorCode.EmptyContent,
      "AnswerContent cannot be empty",
    );
  }
  return value as AnswerContent;
}

/**
 * AnswerContentから生の文字列値を取り出す
 */
export function unwrapAnswerContent(content: AnswerContent): string {
  return content;
}

/**
 * インデックス構築用のドキュメント入力型
 */
export type IndexDocument = Readonly<{
  id: DocumentId;
  title: string;
  content: string;
}>;

/**
 * 検索結果のソース情報
 */
export type QuerySource = Readonly<{
  documentId: DocumentId;
  documentTitle: string;
  relevantContent: string;
  score: SimilarityScore;
}>;

/**
 * 検索と回答生成の結果
 */
export type QueryResult = Readonly<{
  answer: string;
  sources: QuerySource[];
}>;

/**
 * インデックスの状態情報
 */
export type IndexStatus = Readonly<{
  isAvailable: boolean;
}>;

/**
 * インデックス構築の結果
 */
export type IndexBuildResult = Readonly<{
  totalDocuments: number;
  totalEntries: number;
  buildDuration: number;
}>;

export type VectorIndexEntryId = string & {
  readonly brand: "VectorIndexEntryId";
};

export function createVectorIndexEntryId(value: string): VectorIndexEntryId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidVectorIndexEntryId,
      "VectorIndexEntryId cannot be empty",
    );
  }
  return value as VectorIndexEntryId;
}

export type Embedding = number[] & { readonly brand: "Embedding" };

export function createEmbedding(value: number[]): Embedding {
  if (value.length === 0) {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidEmbedding,
      "Embedding cannot be empty",
    );
  }
  return value as Embedding;
}

export type TopK = number & { readonly brand: "TopK" };

export function createTopK(value: number): TopK {
  if (!Number.isInteger(value) || value <= 0) {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidTopK,
      "TopK must be a positive integer",
    );
  }
  return value as TopK;
}

export type TextSplitterConfig = Readonly<{
  chunkSize: number;
  chunkOverlap: number;
}>;

export function createTextSplitterConfig(
  chunkSize: number,
  chunkOverlap: number,
): TextSplitterConfig {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidTextSplitterConfig,
      "chunkSize must be a positive integer",
    );
  }
  if (!Number.isInteger(chunkOverlap) || chunkOverlap < 0) {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidTextSplitterConfig,
      "chunkOverlap must be a non-negative integer",
    );
  }
  if (chunkOverlap >= chunkSize) {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidTextSplitterConfig,
      "chunkOverlap must be less than chunkSize",
    );
  }
  return {
    chunkSize,
    chunkOverlap,
  };
}
