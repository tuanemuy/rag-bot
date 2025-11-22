import type { AnswerRepository } from "@/core/domain/answer/ports/answerRepository";
import type { DocumentRepository } from "@/core/domain/document/ports/documentRepository";

/**
 * UnitOfWork内で利用可能なリポジトリの集合
 *
 * answerRepositoryはオプショナルであり、回答関連の操作が
 * サポートされていないか不要なコンテキストでは未定義になる場合があります。
 * 使用前に必ず存在確認を行ってください:
 *   if (repositories.answerRepository) { ... }
 */
export type Repositories = {
  documentRepository: DocumentRepository;
  answerRepository?: AnswerRepository;
};

export interface UnitOfWorkProvider {
  runInTx<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T>;
  run<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T>;
}
