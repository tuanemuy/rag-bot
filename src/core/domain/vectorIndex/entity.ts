import { BusinessRuleError } from "@/core/domain/error";
import type { DocumentId, SimilarityScore } from "@/core/domain/shared";
import { VectorIndexErrorCode } from "./errorCode";
import type { Embedding, VectorIndexEntryId } from "./valueObject";

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
  if ((params.embedding as number[]).length === 0) {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidEmbedding,
      "Embedding cannot be empty",
    );
  }
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

export type VectorIndexStatus = Readonly<{
  entryCount: number;
  lastUpdatedAt: Date | null;
}>;

export function isIndexAvailable(status: VectorIndexStatus): boolean {
  return status.entryCount > 0;
}

export type VectorIndexBuildResult = Readonly<{
  totalDocuments: number;
  totalEntries: number;
  buildDuration: number;
}>;

export function createBuildResult(
  totalDocuments: number,
  totalEntries: number,
  startTime: Date,
): VectorIndexBuildResult {
  return {
    totalDocuments,
    totalEntries,
    buildDuration: Date.now() - startTime.getTime(),
  };
}
