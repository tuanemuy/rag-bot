import type { DocumentRepository } from "@/core/domain/document/ports/documentRepository";

/**
 * UnitOfWork内で利用可能なリポジトリの集合
 */
export type Repositories = {
  documentRepository: DocumentRepository;
};

export interface UnitOfWork {
  runInTx<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T>;
  run<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T>;
}
