import type { Document } from "@/core/domain/document/entity";
import type { DocumentSource } from "@/core/domain/document/ports/documentSource";

/**
 * 空のDocumentSource実装
 *
 * テスト用または開発時の仮実装として使用
 */
export class EmptyDocumentSource implements DocumentSource {
  async *iterate(): AsyncIterable<Document> {
    // 何も返さない
  }
}
