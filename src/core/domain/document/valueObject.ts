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
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      DocumentErrorCode.InvalidUrl,
      "DocumentUrl cannot be empty",
    );
  }
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

export type DocumentMetadata = Readonly<{
  sourceUrl: DocumentUrl;
  additionalData: Readonly<Record<string, string | number | boolean | null>>;
}>;
