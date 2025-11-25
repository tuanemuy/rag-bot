export const DocumentErrorCode = {
  // 取得エラー
  FetchFailed: "DOCUMENT_FETCH_FAILED",

  // 永続化エラー
  SaveFailed: "DOCUMENT_SAVE_FAILED",

  // バリデーションエラー
  InvalidUrl: "DOCUMENT_INVALID_URL",
  EmptyContent: "DOCUMENT_EMPTY_CONTENT",
  EmptyTitle: "DOCUMENT_EMPTY_TITLE",
} as const;

export type DocumentErrorCode =
  (typeof DocumentErrorCode)[keyof typeof DocumentErrorCode];
