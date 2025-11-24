import type { QueryEngine } from "@/core/domain/vectorIndex/ports/queryEngine";
import type { QueryResult } from "@/core/domain/vectorIndex/valueObject";

export class EmptyQueryEngine implements QueryEngine {
  async query(_question: string, _topK: number): Promise<QueryResult> {
    return {
      answer: "",
      sources: [],
    };
  }
}
