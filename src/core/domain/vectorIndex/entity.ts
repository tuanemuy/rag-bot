import { BusinessRuleError } from "@/core/domain/error";
import type { DocumentId, SimilarityScore } from "@/core/domain/shared";
import { VectorIndexErrorCode } from "./errorCode";
import {
  type AnswerContent,
  type AnswerId,
  type AnswerSourceId,
  createAnswerContent,
  type Embedding,
  generateAnswerSourceId,
  type IndexBuildResult,
  type QueryResult,
  type Question,
  type VectorIndexEntryId,
} from "./valueObject";

// Answer関連のエンティティ

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
  // 値オブジェクト（Question, AnswerContent）は既にファクトリ関数でバリデーション済み
  // エンティティファクトリでは複数フィールドの相互バリデーションのみを実施
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
    id: generateAnswerSourceId(id, index),
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

/**
 * QueryResultからAnswerを生成する
 */
export function createAnswerFromQueryResult(
  id: AnswerId,
  question: Question,
  queryResult: QueryResult,
  generatedAt: Date,
): Answer {
  const sources = queryResult.sources.map((source, index) => ({
    id: generateAnswerSourceId(id, index),
    documentId: source.documentId,
    documentTitle: source.documentTitle,
    relevantContent: source.relevantContent,
    score: source.score,
  }));

  return {
    id,
    question,
    content: createAnswerContent(queryResult.answer),
    sources,
    generatedAt,
  };
}

/**
 * 関連ドキュメントが見つからなかった場合のAnswerを生成する
 */
export function createNoRelevantDocumentsAnswer(
  id: AnswerId,
  question: Question,
): Answer {
  return {
    id,
    question,
    content: createAnswerContent(
      "該当する情報が見つかりませんでした。質問を変えてお試しください。",
    ),
    sources: [],
    generatedAt: new Date(),
  };
}

/**
 * インデックスが未構築の場合のAnswerを生成する
 */
export function createIndexNotBuiltAnswer(
  id: AnswerId,
  question: Question,
): Answer {
  return {
    id,
    question,
    content: createAnswerContent(
      "インデックスが構築されていません。先にsyncコマンドを実行してください。",
    ),
    sources: [],
    generatedAt: new Date(),
  };
}

export type VectorIndexEntry = Readonly<{
  id: VectorIndexEntryId;
  documentId: DocumentId;
  documentTitle: string;
  content: string;
  embedding: Embedding;
  chunkIndex: number;
  createdAt: Date;
}>;

export function createVectorIndexEntry(params: {
  id: VectorIndexEntryId;
  documentId: DocumentId;
  documentTitle: string;
  content: string;
  embedding: Embedding;
  chunkIndex: number;
  createdAt: Date;
}): VectorIndexEntry {
  // Embeddingは既にcreateEmbedding()でバリデーション済み
  // プリミティブ型のフィールドのみエンティティファクトリでチェック
  if (params.chunkIndex < 0) {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidChunkIndex,
      "Chunk index must be non-negative",
    );
  }
  return params;
}

export type SearchResult = Readonly<{
  entry: VectorIndexEntry;
  score: SimilarityScore;
}>;

export function createBuildResult(
  totalDocuments: number,
  totalEntries: number,
  startTime: Date,
): IndexBuildResult {
  return {
    totalDocuments,
    totalEntries,
    buildDuration: Date.now() - startTime.getTime(),
  };
}
