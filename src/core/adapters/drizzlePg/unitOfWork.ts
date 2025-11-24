import type { Repositories, UnitOfWork } from "@/core/application/unitOfWork";
import type { Database, Executor } from "./client";
import { DrizzlePgDocumentRepository } from "./documentRepository";

export class DrizzlePgUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Database) {}

  private createRepositories(executor: Executor): Repositories {
    return {
      documentRepository: new DrizzlePgDocumentRepository(executor),
    };
  }

  async runInTx<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      const repositories = this.createRepositories(tx);
      return fn(repositories);
    });
  }

  async run<T>(fn: (repositories: Repositories) => Promise<T>): Promise<T> {
    const repositories = this.createRepositories(this.db);
    return fn(repositories);
  }
}
