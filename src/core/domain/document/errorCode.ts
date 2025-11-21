export const DocumentErrorCode = {
  // 取得エラー
  FetchFailed: "DOCUMENT_FETCH_FAILED",
  ListFetchFailed: "DOCUMENT_LIST_FETCH_FAILED",
  ContentFetchFailed: "DOCUMENT_CONTENT_FETCH_FAILED",

  // パースエラー
  ParseFailed: "DOCUMENT_PARSE_FAILED",
  InvalidJsonFormat: "DOCUMENT_INVALID_JSON_FORMAT",
  InvalidHtmlFormat: "DOCUMENT_INVALID_HTML_FORMAT",
  FieldNotFound: "DOCUMENT_FIELD_NOT_FOUND",
  SelectorNotFound: "DOCUMENT_SELECTOR_NOT_FOUND",

  // 永続化エラー
  SaveFailed: "DOCUMENT_SAVE_FAILED",

  // バリデーションエラー
  InvalidUrl: "DOCUMENT_INVALID_URL",
  EmptyContent: "DOCUMENT_EMPTY_CONTENT",
} as const;

export type DocumentErrorCode =
  (typeof DocumentErrorCode)[keyof typeof DocumentErrorCode];
