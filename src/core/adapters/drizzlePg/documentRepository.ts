import { eq, type InferSelectModel, sql } from "drizzle-orm";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { Document } from "@/core/domain/document/entity";
import type { DocumentRepository } from "@/core/domain/document/ports/documentRepository";
import type {
  DocumentContent,
  DocumentMetadata,
  DocumentTitle,
} from "@/core/domain/document/valueObject";
import type { DocumentId } from "@/core/domain/shared";
import { createDocumentId } from "@/core/domain/shared";
import type { Executor } from "./client";
import { documents } from "./schema";

type DocumentDataModel = InferSelectModel<typeof documents>;

export class DrizzlePgDocumentRepository implements DocumentRepository {
  constructor(private readonly executor: Executor) {}

  private toEntity(data: DocumentDataModel): Document {
    return {
      id: createDocumentId(data.id),
      title: data.title as DocumentTitle,
      content: data.content as DocumentContent,
      metadata: data.metadata as DocumentMetadata,
      fetchedAt: data.fetchedAt,
    };
  }

  async save(document: Document): Promise<void> {
    try {
      await this.executor
        .insert(documents)
        .values({
          id: document.id,
          title: document.title as string,
          content: document.content as string,
          metadata: document.metadata,
          fetchedAt: document.fetchedAt,
        })
        .onConflictDoUpdate({
          target: documents.id,
          set: {
            title: document.title as string,
            content: document.content as string,
            metadata: document.metadata,
            fetchedAt: document.fetchedAt,
          },
        });
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.DatabaseError,
        "Failed to save document",
        error,
      );
    }
  }

  async saveMany(documentList: Document[]): Promise<void> {
    if (documentList.length === 0) {
      return;
    }

    try {
      const values = documentList.map((document) => ({
        id: document.id,
        title: document.title as string,
        content: document.content as string,
        metadata: document.metadata,
        fetchedAt: document.fetchedAt,
      }));

      await this.executor
        .insert(documents)
        .values(values)
        .onConflictDoUpdate({
          target: documents.id,
          set: {
            title: sql`excluded.title`,
            content: sql`excluded.content`,
            metadata: sql`excluded.metadata`,
            fetchedAt: sql`excluded.fetched_at`,
          },
        });
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.DatabaseError,
        "Failed to save documents",
        error,
      );
    }
  }

  async findAll(): Promise<Document[]> {
    try {
      const results = await this.executor.select().from(documents);
      return results.map((row) => this.toEntity(row));
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.DatabaseError,
        "Failed to find all documents",
        error,
      );
    }
  }

  async findById(id: DocumentId): Promise<Document | null> {
    try {
      const results = await this.executor
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return this.toEntity(results[0]);
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.DatabaseError,
        "Failed to find document by id",
        error,
      );
    }
  }

  async count(): Promise<number> {
    try {
      const result = await this.executor
        .select({ count: sql<number>`count(*)::int` })
        .from(documents);

      return result[0].count;
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.DatabaseError,
        "Failed to count documents",
        error,
      );
    }
  }

  async deleteAll(): Promise<void> {
    try {
      await this.executor.delete(documents);
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.DatabaseError,
        "Failed to delete all documents",
        error,
      );
    }
  }
}
