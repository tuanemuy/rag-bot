import type { TextSplitterConfig } from "../valueObject";

export interface TextSplitter {
  /**
   * テキストをチャンクに分割する
   * @param text - 分割対象のテキスト
   * @param config - 分割設定
   * @returns 分割されたチャンクの配列
   */
  split(text: string, config: TextSplitterConfig): string[];
}
