import { BusinessRuleError } from "@/core/domain/error";
import { VectorIndexErrorCode } from "./errorCode";

export type { DocumentId, SimilarityScore } from "@/core/domain/shared";
export { createDocumentId, createSimilarityScore } from "@/core/domain/shared";

export type VectorIndexEntryId = string & {
  readonly brand: "VectorIndexEntryId";
};

export function createVectorIndexEntryId(value: string): VectorIndexEntryId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      VectorIndexErrorCode.InvalidEmbedding,
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
