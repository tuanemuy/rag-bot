import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./api/app";
import { routes } from "./api/routes";

const app = createApp("/api");
app.route("/", routes);

serve({
  fetch: app.fetch,
  port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined,
});
