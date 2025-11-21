import type { Document, RawDocument } from "../entity";
import type { ParserConfig } from "../valueObject";

export interface DocumentParser {
  /**
   * 生のドキュメントをパースして構造化する
   * @throws ValidationError - パースに失敗した場合
   */
  parse(rawDocument: RawDocument, config: ParserConfig): Document;
}
