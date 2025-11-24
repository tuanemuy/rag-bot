import type { Repositories, UnitOfWork } from "@/core/application/unitOfWork";
import { EmptyDocumentRepository } from "./documentRepository";

export class EmptyUnitOfWork implements UnitOfWork {
  private readonly repositories: Repositories = {
    documentRepository: new EmptyDocumentRepository(),
  };

  async runInTx<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T> {
    return fn(this.repositories);
  }

  async run<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T> {
    return fn(this.repositories);
  }

  getRepositories(): Repositories {
    return this.repositories;
  }
}
