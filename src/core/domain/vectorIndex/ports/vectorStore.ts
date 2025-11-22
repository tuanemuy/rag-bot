import type { DocumentId } from "@/core/domain/shared";
import type {
  SearchResult,
  VectorIndexEntry,
  VectorIndexStatus,
} from "../entity";
import type { Embedding, TopK } from "../valueObject";

export interface VectorStore {
  /**
   * インデックスにエントリを追加する
   * @throws SystemError - 追加に失敗した場合
   */
  add(entries: VectorIndexEntry[]): Promise<void>;

  /**
   * 類似検索を実行する
   * インデックスが空の場合は空配列を返す
   * @throws SystemError - DB操作に失敗した場合
   */
  search(embedding: Embedding, topK: TopK): Promise<SearchResult[]>;

  /**
   * 指定したドキュメントIDに関連するエントリを削除する
   *
   * 冪等性を保つため、存在しないdocumentIdを指定した場合は何もせず成功とする
   *
   * @throws SystemError - DB操作に失敗した場合
   */
  deleteByDocumentId(documentId: DocumentId): Promise<void>;

  /**
   * インデックスをクリアする
   * @throws SystemError - クリアに失敗した場合
   */
  clear(): Promise<void>;

  /**
   * インデックスの状態を取得する
   */
  getStatus(): Promise<VectorIndexStatus>;
}
