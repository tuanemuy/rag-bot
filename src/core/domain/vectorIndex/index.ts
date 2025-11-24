// Entity
export {
  type Answer,
  type AnswerSource,
  createAnswer,
  createAnswerFromContext,
  createAnswerFromQueryResult,
  createBuildResult,
  createIndexNotBuiltAnswer,
  createNoRelevantDocumentsAnswer,
  createVectorIndexEntry,
  type RetrievalContext,
  type RetrievedDocument,
  type SearchResult,
  type VectorIndexEntry,
} from "./entity";

// Error codes
export { VectorIndexErrorCode } from "./errorCode";

// Ports
export type { IndexBuilder } from "./ports/indexBuilder";
export type { QueryEngine } from "./ports/queryEngine";

// Value objects
export {
  type AnswerContent,
  type AnswerId,
  type AnswerSourceId,
  createAnswerContent,
  createAnswerId,
  createDocumentId,
  createEmbedding,
  createQuestion,
  createSimilarityScore,
  createTextSplitterConfig,
  createTopK,
  createVectorIndexEntryId,
  type DocumentId,
  type Embedding,
  generateAnswerId,
  generateAnswerSourceId,
  type IndexBuildResult,
  type IndexDocument,
  type IndexStatus,
  type QueryResult,
  type QuerySource,
  type Question,
  type SimilarityScore,
  type TextSplitterConfig,
  type TopK,
  unwrapAnswerContent,
  type VectorIndexEntryId,
} from "./valueObject";
