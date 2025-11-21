import type {
  Repositories,
  UnitOfWorkProvider,
} from "@/core/application/unitOfWork";
// import { DrizzlePg${Entity}Repository } from "./${entity}Repository";
import type { Database, Executor } from "./client";

export class DrizzlePgUnitOfWorkProvider implements UnitOfWorkProvider {
  constructor(private readonly db: Database) {}

  private createRepositories(executor: Executor): Repositories {
    return {
      // ${entity}Repository: new DrizzlePg${Entity}Repository(executor),
    } as Repositories;
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
