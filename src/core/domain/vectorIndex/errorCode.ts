export const VectorIndexErrorCode = {
  // 埋め込み生成エラー
  EmbeddingGenerationFailed: "VECTOR_INDEX_EMBEDDING_GENERATION_FAILED",

  // インデックス操作エラー
  AddFailed: "VECTOR_INDEX_ADD_FAILED",
  SearchFailed: "VECTOR_INDEX_SEARCH_FAILED",
  DeleteFailed: "VECTOR_INDEX_DELETE_FAILED",
  ClearFailed: "VECTOR_INDEX_CLEAR_FAILED",
  BuildFailed: "VECTOR_INDEX_BUILD_FAILED",

  // ステータスエラー
  IndexNotFound: "VECTOR_INDEX_NOT_FOUND",
  IndexEmpty: "VECTOR_INDEX_EMPTY",
  NotAvailable: "VECTOR_INDEX_NOT_AVAILABLE",

  // バリデーションエラー
  InvalidTopK: "VECTOR_INDEX_INVALID_TOP_K",
  InvalidEmbedding: "VECTOR_INDEX_INVALID_EMBEDDING",
  InvalidChunkIndex: "VECTOR_INDEX_INVALID_CHUNK_INDEX",
  InvalidVectorIndexEntryId: "VECTOR_INDEX_INVALID_VECTOR_INDEX_ENTRY_ID",
  InvalidTextSplitterConfig: "VECTOR_INDEX_INVALID_TEXT_SPLITTER_CONFIG",

  // 回答関連エラー
  ContextRetrievalFailed: "VECTOR_INDEX_CONTEXT_RETRIEVAL_FAILED",
  NoRelevantDocuments: "VECTOR_INDEX_NO_RELEVANT_DOCUMENTS",
  GenerationFailed: "VECTOR_INDEX_GENERATION_FAILED",
  LlmApiError: "VECTOR_INDEX_LLM_API_ERROR",
  EmptyQuestion: "VECTOR_INDEX_EMPTY_QUESTION",
  EmptyContent: "VECTOR_INDEX_EMPTY_CONTENT",
  InvalidAnswerId: "VECTOR_INDEX_INVALID_ANSWER_ID",
} as const;

export type VectorIndexErrorCode =
  (typeof VectorIndexErrorCode)[keyof typeof VectorIndexErrorCode];
