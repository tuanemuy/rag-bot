// import { ConsoleLogger } from "@/core/adapters/console/logger";
import { getDatabase } from "@/core/adapters/drizzlePg/client";
import { DrizzlePgUnitOfWorkProvider } from "@/core/adapters/drizzlePg/unitOfWork";
import type { AppConfig, Container } from "@/core/application/container";

export function withContainer<T extends unknown[], K>(
  fn: (container: Container, ...args: T) => Promise<K>,
): (...args: T) => K | Promise<K> {
  return (...args: T) => {
    const container = createContainer();
    return fn(container, ...args);
  };
}

function createContainer(): Container {
  // Get configuration from environment variables
  const config: AppConfig = {
    appUrl: process.env.APP_URL,
    databaseUrl: process.env.DATABASE_URL,
  };

  // Create database instance
  const db = getDatabase(config.databaseUrl);

  // Create adapters
  const unitOfWorkProvider = new DrizzlePgUnitOfWorkProvider(db);
  // const logger = new ConsoleLogger();

  return {
    config,
    unitOfWorkProvider,
    // logger,
    // ...other dependencies
  };
}
