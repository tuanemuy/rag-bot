export const SharedErrorCode = {
  InvalidDocumentId: "INVALID_DOCUMENT_ID",
  InvalidSimilarityScore: "INVALID_SIMILARITY_SCORE",
} as const;

export type SharedErrorCode =
  (typeof SharedErrorCode)[keyof typeof SharedErrorCode];
