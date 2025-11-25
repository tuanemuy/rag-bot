import type { IndexBuilder } from "@/core/domain/vectorIndex/ports/indexBuilder";
import type {
  IndexBuildResult,
  IndexDocument,
  IndexStatus,
} from "@/core/domain/vectorIndex/valueObject";

export class EmptyIndexBuilder implements IndexBuilder {
  async addDocuments(_documents: IndexDocument[]): Promise<IndexBuildResult> {
    return {
      totalDocuments: 0,
      totalEntries: 0,
      buildDuration: 0,
    };
  }

  async clearIndex(): Promise<void> {
    // No-op
  }

  async getStatus(): Promise<IndexStatus> {
    return {
      isAvailable: false,
    };
  }
}
