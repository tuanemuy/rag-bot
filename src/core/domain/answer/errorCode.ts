export const AnswerErrorCode = {
  // コンテキスト取得エラー
  ContextRetrievalFailed: "ANSWER_CONTEXT_RETRIEVAL_FAILED",
  NoRelevantDocuments: "ANSWER_NO_RELEVANT_DOCUMENTS",

  // 回答生成エラー
  GenerationFailed: "ANSWER_GENERATION_FAILED",
  LlmApiError: "ANSWER_LLM_API_ERROR",

  // インデックスエラー
  IndexNotAvailable: "ANSWER_INDEX_NOT_AVAILABLE",

  // 永続化エラー
  SaveFailed: "ANSWER_SAVE_FAILED",

  // バリデーションエラー
  EmptyQuestion: "ANSWER_EMPTY_QUESTION",
  EmptyContent: "ANSWER_EMPTY_CONTENT",
} as const;

export type AnswerErrorCode =
  (typeof AnswerErrorCode)[keyof typeof AnswerErrorCode];
