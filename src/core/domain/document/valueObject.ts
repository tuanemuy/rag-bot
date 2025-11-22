import { BusinessRuleError } from "@/core/domain/error";
import { DocumentErrorCode } from "./errorCode";

export type { DocumentId } from "@/core/domain/shared";
export { createDocumentId } from "@/core/domain/shared";

export type DocumentTitle = string & { readonly brand: "DocumentTitle" };

export function createDocumentTitle(value: string): DocumentTitle {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      DocumentErrorCode.EmptyTitle,
      "Document title cannot be empty",
    );
  }
  return value as DocumentTitle;
}

export type DocumentContent = string & { readonly brand: "DocumentContent" };

export function createDocumentContent(value: string): DocumentContent {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      DocumentErrorCode.EmptyContent,
      "Document content cannot be empty",
    );
  }
  return value as DocumentContent;
}

export type DocumentUrl = string & { readonly brand: "DocumentUrl" };

export function createDocumentUrl(value: string): DocumentUrl {
  try {
    new URL(value);
  } catch {
    throw new BusinessRuleError(
      DocumentErrorCode.InvalidUrl,
      "Invalid URL format",
    );
  }
  return value as DocumentUrl;
}

export type DocumentFormat = "json" | "html" | "text";

export type DocumentMetadata = Readonly<{
  sourceUrl: DocumentUrl;
  format: DocumentFormat;
  additionalData: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type PaginationType = "offset" | "cursor";

export type OffsetPagination = Readonly<{
  type: "offset";
  offset: number;
  limit: number;
  total: number;
}>;

export function createOffsetPagination(
  offset: number,
  limit: number,
  total: number,
): OffsetPagination {
  if (offset < 0) {
    throw new BusinessRuleError(
      DocumentErrorCode.InvalidPagination,
      "Offset must be greater than or equal to 0",
    );
  }
  if (limit <= 0) {
    throw new BusinessRuleError(
      DocumentErrorCode.InvalidPagination,
      "Limit must be greater than 0",
    );
  }
  if (total < 0) {
    throw new BusinessRuleError(
      DocumentErrorCode.InvalidPagination,
      "Total must be greater than or equal to 0",
    );
  }
  return {
    type: "offset",
    offset,
    limit,
    total,
  };
}

export type CursorPagination = Readonly<{
  type: "cursor";
  cursor: string | null;
  hasNext: boolean;
}>;

/**
 * JSONドキュメントのパース設定
 */
export type JsonParserConfig = Readonly<{
  format: "json";
  titlePath: string;
  contentPath: string;
  metadataPath?: string;
}>;

/**
 * HTMLドキュメントのパース設定
 */
export type HtmlParserConfig = Readonly<{
  format: "html";
  titleSelector: string;
  contentSelector: string;
}>;

/**
 * プレーンテキストドキュメントのパース設定
 */
export type TextParserConfig = Readonly<{
  format: "text";
  titleLineCount?: number;
}>;

/**
 * パーサー設定の判別共用体
 */
export type ParserConfig =
  | JsonParserConfig
  | HtmlParserConfig
  | TextParserConfig;
