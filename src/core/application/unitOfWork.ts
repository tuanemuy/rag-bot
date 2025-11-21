import type { AnswerRepository } from "@/core/domain/answer/ports/answerRepository";
import type { DocumentRepository } from "@/core/domain/document/ports/documentRepository";

export type Repositories = {
  documentRepository: DocumentRepository;
  answerRepository?: AnswerRepository;
};

export interface UnitOfWorkProvider {
  runInTx<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T>;
  run<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T>;
}
