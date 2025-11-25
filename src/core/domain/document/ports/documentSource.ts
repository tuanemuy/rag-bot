import type { Document } from "../entity";

/**
 * すべてのドキュメントを順次取得するインターフェース
 * データソース固有の取得・パース処理はアダプター実装に委譲する
 */
export interface DocumentSource {
  /**
   * すべてのドキュメントを順次取得するイテレータを返す
   * 取得・パース処理はアダプター実装に依存
   * @throws SystemError - ドキュメント取得に失敗した場合
   */
  iterate(): AsyncIterable<Document>;
}
