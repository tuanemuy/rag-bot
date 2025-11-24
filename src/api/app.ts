import { type Context, Hono, type Next } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import type { Container } from "@/core/application/container";
import { createContainer } from "./di";
import { errorHandler } from "./error";

export type HonoEnv = {
  Variables: {
    container: Container;
  };
};

function init() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const container = createContainer();
    c.set("container", container);
    await next();
  };
}

export function createApp(basePath: string) {
  const app = new Hono<HonoEnv>().basePath(basePath);
  app.use(prettyJSON());
  app.onError(errorHandler);
  app.use("*", logger());
  app.use("*", init());
  return app;
}
export type App = ReturnType<typeof createApp>;
