import type { DocumentId } from "@/core/domain/shared";
import type { Document } from "../entity";

export interface DocumentRepository {
  /**
   * ドキュメントを保存する
   * @throws SystemError - 保存に失敗した場合
   */
  save(document: Document): Promise<void>;

  /**
   * ドキュメントを一括保存する
   * トランザクション内での使用を前提とし、全件成功/全件失敗のセマンティクスを持つ
   * @throws SystemError - 保存に失敗した場合（1件でも失敗した場合は全体をロールバック）
   */
  saveMany(documents: Document[]): Promise<void>;

  /**
   * すべてのドキュメントを取得する
   */
  findAll(): Promise<Document[]>;

  /**
   * IDでドキュメントを取得する
   */
  findById(id: DocumentId): Promise<Document | null>;

  /**
   * ドキュメント数を取得する
   */
  count(): Promise<number>;

  /**
   * すべてのドキュメントを削除する
   */
  deleteAll(): Promise<void>;
}
