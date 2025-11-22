export {
  createBuildResult,
  createVectorIndexEntry,
  isIndexAvailable,
  type SearchResult,
  type VectorIndexBuildResult,
  type VectorIndexEntry,
  type VectorIndexStatus,
} from "./entity";
export { VectorIndexErrorCode } from "./errorCode";
export type { EmbeddingGenerator } from "./ports/embeddingGenerator";
export type { TextSplitter } from "./ports/textSplitter";
export type { VectorStore } from "./ports/vectorStore";
export {
  createDocumentId,
  createEmbedding,
  createSimilarityScore,
  createTextSplitterConfig,
  createTopK,
  createVectorIndexEntryId,
  type DocumentId,
  type Embedding,
  type SimilarityScore,
  type TextSplitterConfig,
  type TopK,
  type VectorIndexEntryId,
} from "./valueObject";
