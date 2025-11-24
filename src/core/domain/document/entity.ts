import type { DocumentId } from "@/core/domain/shared";
import type { IndexDocument } from "@/core/domain/vectorIndex/valueObject";
import {
  createDocumentContent,
  createDocumentTitle,
  type DocumentContent,
  type DocumentMetadata,
  type DocumentTitle,
} from "./valueObject";

export type Document = Readonly<{
  id: DocumentId;
  title: DocumentTitle;
  content: DocumentContent;
  metadata: DocumentMetadata;
  fetchedAt: Date;
}>;

export function createDocument(params: {
  id: DocumentId;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  fetchedAt: Date;
}): Document {
  return {
    id: params.id,
    title: createDocumentTitle(params.title),
    content: createDocumentContent(params.content),
    metadata: params.metadata,
    fetchedAt: params.fetchedAt,
  };
}

export type SyncResult = Readonly<{
  totalCount: number;
  successCount: number;
  failedCount: number;
  failedIds: DocumentId[];
}>;

export function createSyncResult(
  results: Array<{ id: DocumentId; success: boolean }>,
): SyncResult {
  const failedIds = results.filter((r) => !r.success).map((r) => r.id);
  return {
    totalCount: results.length,
    successCount: results.length - failedIds.length,
    failedCount: failedIds.length,
    failedIds,
  };
}

/**
 * DocumentをIndexDocument形式に変換する
 */
export function toIndexDocument(document: Document): IndexDocument {
  return {
    id: document.id,
    title: document.title,
    content: document.content,
  };
}
