import type { Embedding } from "../valueObject";

export interface EmbeddingGenerator {
  /**
   * テキストからベクトル埋め込みを生成する
   * @param text - 埋め込み対象のテキスト（ドキュメントチャンクまたは検索クエリ）
   * @throws SystemError - 埋め込み生成に失敗した場合
   */
  generate(text: string): Promise<Embedding>;

  /**
   * 複数テキストからベクトル埋め込みを一括生成する
   * @throws SystemError - 埋め込み生成に失敗した場合
   */
  generateBatch(texts: string[]): Promise<Embedding[]>;
}
