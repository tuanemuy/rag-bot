// import type { Logger } from "@/core/domain/common/ports/logger";
import type { UnitOfWorkProvider } from "./unitOfWork";

/**
 * Application configuration
 */
export type AppConfig = {
  appUrl: string;
  databaseUrl: string;
};

/**
 * Dependency Injection Container
 */
export type Container = {
  config: AppConfig;
  unitOfWorkProvider: UnitOfWorkProvider;
  // logger: Logger;
};
