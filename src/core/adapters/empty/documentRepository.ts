import type { Document } from "@/core/domain/document/entity";
import type { DocumentRepository } from "@/core/domain/document/ports/documentRepository";
import type { DocumentId } from "@/core/domain/shared";

export class EmptyDocumentRepository implements DocumentRepository {
  async save(_document: Document): Promise<void> {
    // No-op
  }

  async saveMany(_documents: Document[]): Promise<void> {
    // No-op
  }

  async findAll(): Promise<Document[]> {
    return [];
  }

  async findById(_id: DocumentId): Promise<Document | null> {
    return null;
  }

  async count(): Promise<number> {
    return 0;
  }

  async deleteAll(): Promise<void> {
    // No-op
  }
}
