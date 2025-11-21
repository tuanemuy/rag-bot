import { createClient } from "@libsql/client";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import {
  drizzle,
  type LibSQLDatabase,
  type LibSQLTransaction,
} from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;
export type Transaction = LibSQLTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
export type Executor = Database | Transaction;

export function getDatabase(url: string): Database {
  const client = createClient({ url });
  return drizzle(client, { schema });
}
