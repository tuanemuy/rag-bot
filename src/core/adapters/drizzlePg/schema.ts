import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * documentsテーブル
 *
 * パース済みドキュメントを保存するテーブル
 */
export const documents = pgTable(
  "documents",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_documents_fetched_at").on(table.fetchedAt)],
);

// 注記: vector_index_entriesテーブルはLlamaIndexが内部で管理するため、
// Drizzleスキーマには含めない。詳細はspec/database.mdを参照。
