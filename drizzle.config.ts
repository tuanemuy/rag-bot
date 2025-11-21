import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const path = process.env.SQLITE_FILE_PATH;

if (!path) {
  throw new Error("SQLITE_FILE_PATH environment variable is not set.");
}

export default defineConfig({
  out: "./src/core/adapters/drizzleSqlite/migrations",
  schema: "./src/core/adapters/drizzleSqlite/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${path}`,
  },
});
