export const VectorIndexErrorCode = {
  // 埋め込み生成エラー
  EmbeddingGenerationFailed: "VECTOR_INDEX_EMBEDDING_GENERATION_FAILED",

  // インデックス操作エラー
  AddFailed: "VECTOR_INDEX_ADD_FAILED",
  SearchFailed: "VECTOR_INDEX_SEARCH_FAILED",
  DeleteFailed: "VECTOR_INDEX_DELETE_FAILED",
  ClearFailed: "VECTOR_INDEX_CLEAR_FAILED",

  // ステータスエラー
  IndexNotFound: "VECTOR_INDEX_NOT_FOUND",
  IndexEmpty: "VECTOR_INDEX_EMPTY",

  // バリデーションエラー
  InvalidTopK: "VECTOR_INDEX_INVALID_TOP_K",
  InvalidEmbedding: "VECTOR_INDEX_INVALID_EMBEDDING",
  InvalidChunkIndex: "VECTOR_INDEX_INVALID_CHUNK_INDEX",
} as const;

export type VectorIndexErrorCode =
  (typeof VectorIndexErrorCode)[keyof typeof VectorIndexErrorCode];
