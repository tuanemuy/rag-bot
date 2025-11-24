import { Hono } from "hono";
import type { HonoEnv } from "./app";
import { lineRoutes } from "./line/routes";

export const routes = new Hono<HonoEnv>();

// Health check endpoint
routes.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// LINE routes
routes.route("/line", lineRoutes);
