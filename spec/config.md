# 設定スキーマ

## 概要

アプリケーションの設定は各アダプター実装が独自に定義する。機密情報は環境変数から読み込み、非機密情報はTypeScriptファイルで定数として定義する。設定値はZodでバリデーションし、起動時に整合性をチェックする。

## 設定の管理方針

- **機密情報**: 環境変数から読み込み（APIキー、トークン、データベースURL等）
- **非機密情報**: TypeScriptファイルで定数として定義
- **アダプター固有設定**: 各アダプター実装が独自のZodスキーマを定義
- **DIによる切り替え**: 使用するアダプターはDIコンテナで決定

## 環境変数一覧

機密情報は環境変数から読み込む。使用するアダプターに応じて必要な環境変数が異なる。

### 必須環境変数

| 環境変数 | 説明 |
|---------|------|
| DATABASE_URL | PostgreSQL接続URL |

### アダプター固有の環境変数

使用するアダプターに応じて設定する。

| 環境変数 | アダプター例 | 説明 |
|---------|-------------|------|
| LINE_CHANNEL_SECRET | LINE MessageSender | LINEチャネルシークレット |
| LINE_CHANNEL_ACCESS_TOKEN | LINE MessageSender | LINEチャネルアクセストークン |
| OPENAI_API_KEY | LlamaIndex OpenAI | OpenAI APIキー |
| GEMINI_API_KEY | LlamaIndex Gemini | Gemini APIキー |
| NOTION_API_KEY | Notion DocumentSource | Notion APIキー |
| NOTION_DATABASE_ID | Notion DocumentSource | NotionデータベースID |

## アダプター設定例

各アダプターは独自の型安全な設定スキーマを定義する。以下は実装例。

### MessageSender (LINE Adapter)

```typescript
// src/core/adapters/line/config.ts
const lineMessageSenderConfigSchema = z.object({
  channelSecret: z.string().min(1),
  channelAccessToken: z.string().min(1),
  retry: z.object({
    maxRetries: z.number().int().min(0).max(10).default(3),
    initialDelayMs: z.number().int().min(100).default(1000),
    maxDelayMs: z.number().int().min(1000).default(10000),
    backoffMultiplier: z.number().min(1).default(2),
  }).default({}),
});

type LineMessageSenderConfig = z.infer<typeof lineMessageSenderConfigSchema>;
```

### IndexBuilder / QueryEngine (LlamaIndex OpenAI Adapter)

```typescript
// src/core/adapters/llamaIndexOpenAI/config.ts
const llamaIndexOpenAIConfigSchema = z.object({
  embedding: z.object({
    model: z.string().default("text-embedding-ada-002"),
    dimensions: z.number().int().min(1).default(1536),
    apiKey: z.string().min(1),
  }),
  llm: z.object({
    model: z.string().default("gpt-4o-mini"),
    apiKey: z.string().min(1),
    systemPrompt: z.string().default(
      "あなたは親切なアシスタントです。提供された情報に基づいて質問に回答してください。"
    ),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(1).optional(),
  }),
  vectorIndex: z.object({
    chunkSize: z.number().int().min(100).max(10000).default(1000),
    chunkOverlap: z.number().int().min(0).default(200),
    topK: z.number().int().min(1).max(100).default(5),
  }),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().int().min(1).max(100).default(10),
  }),
});

type LlamaIndexOpenAIConfig = z.infer<typeof llamaIndexOpenAIConfigSchema>;
```

### IndexBuilder / QueryEngine (LlamaIndex Gemini Adapter)

```typescript
// src/core/adapters/llamaIndexGemini/config.ts
const llamaIndexGeminiConfigSchema = z.object({
  embedding: z.object({
    model: z.string().default("text-embedding-004"),
    dimensions: z.number().int().min(1).default(768),
    apiKey: z.string().min(1),
  }),
  llm: z.object({
    model: z.string().default("gemini-1.5-flash"),
    apiKey: z.string().min(1),
    systemPrompt: z.string().default(
      "あなたは親切なアシスタントです。提供された情報に基づいて質問に回答してください。"
    ),
    temperature: z.number().min(0).max(2).default(0.7),
    maxOutputTokens: z.number().int().min(1).optional(),
  }),
  vectorIndex: z.object({
    chunkSize: z.number().int().min(100).max(10000).default(1000),
    chunkOverlap: z.number().int().min(0).default(200),
    topK: z.number().int().min(1).max(100).default(5),
  }),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().int().min(1).max(100).default(10),
  }),
});

type LlamaIndexGeminiConfig = z.infer<typeof llamaIndexGeminiConfigSchema>;
```

### DocumentSource (HTTP Sitemap Adapter)

```typescript
// src/core/adapters/httpSitemap/config.ts
const httpSitemapConfigSchema = z.object({
  sitemapUrl: z.string().url(),
  contentSelector: z.string(),
  titleSelector: z.string(),
  authType: z.enum(["none", "bearer", "apiKey"]).default("none"),
  authToken: z.string().optional(),
  authHeader: z.string().default("Authorization"),
});

type HttpSitemapConfig = z.infer<typeof httpSitemapConfigSchema>;
```

### DocumentSource (Notion Adapter)

```typescript
// src/core/adapters/notion/config.ts
const notionDocumentSourceConfigSchema = z.object({
  apiKey: z.string().min(1),
  databaseId: z.string().min(1),
});

type NotionDocumentSourceConfig = z.infer<typeof notionDocumentSourceConfigSchema>;
```

### UnitOfWork (Drizzle Adapter)

```typescript
// src/core/adapters/drizzlePg/config.ts
const drizzleConfigSchema = z.object({
  url: z.string().url(),
  poolSize: z.number().int().min(1).max(100).default(10),
});

type DrizzleConfig = z.infer<typeof drizzleConfigSchema>;
```

## DIコンテナへの注入

各アダプターの設定を読み込み、DIコンテナで組み合わせる。

```typescript
// src/di.ts
import { z } from "zod";

export function createContainer(): ApplicationContext {
  // Drizzle Adapter設定
  const drizzleConfig = drizzleConfigSchema.parse({
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || "10"),
  });

  // LlamaIndex OpenAI Adapter設定
  const llamaIndexConfig = llamaIndexOpenAIConfigSchema.parse({
    embedding: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    llm: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    vectorIndex: {},
    database: drizzleConfig,
  });

  // LINE Adapter設定
  const lineConfig = lineMessageSenderConfigSchema.parse({
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });

  // HTTP Sitemap Adapter設定
  const httpSitemapConfig = httpSitemapConfigSchema.parse({
    sitemapUrl: process.env.DOCUMENT_SITEMAP_URL,
    contentSelector: process.env.DOCUMENT_CONTENT_SELECTOR,
    titleSelector: process.env.DOCUMENT_TITLE_SELECTOR,
  });

  return {
    unitOfWork: createDrizzleUnitOfWork(drizzleConfig),
    indexBuilder: createLlamaIndexOpenAIIndexBuilder(llamaIndexConfig),
    queryEngine: createLlamaIndexOpenAIQueryEngine(llamaIndexConfig),
    documentSource: createHttpSitemapDocumentSource(httpSitemapConfig),
    messageSender: createLineMessageSender(lineConfig),
  };
}
```

## 起動時のバリデーション

アプリケーション起動時に以下のバリデーションを実行する:

1. **必須環境変数の存在確認**: 未設定の場合はエラーを投げる
2. **Zodスキーマによるバリデーション**: 各アダプター設定の型と制約のチェック
3. **設定間の整合性チェック**: アダプター間で整合性が必要な場合

```typescript
// 起動時のチェック例
async function validateConfig(
  llamaIndexConfig: LlamaIndexOpenAIConfig,
  drizzleConfig: DrizzleConfig
): Promise<void> {
  // ベクトル次元数の整合性チェック
  const dbDimensions = await getDbVectorDimensions(drizzleConfig.url);
  if (dbDimensions !== llamaIndexConfig.embedding.dimensions) {
    throw new Error(
      `Vector dimensions mismatch: DB=${dbDimensions}, Config=${llamaIndexConfig.embedding.dimensions}`
    );
  }

  // チャンク設定の整合性チェック
  const { chunkOverlap, chunkSize } = llamaIndexConfig.vectorIndex;
  if (chunkOverlap >= chunkSize) {
    throw new Error(
      `chunkOverlap (${chunkOverlap}) must be less than chunkSize (${chunkSize})`
    );
  }
}
```

## 実装パス

- `src/core/adapters/{adapter}/config.ts` - 各アダプターの設定スキーマ定義
- `src/di.ts` - DIコンテナ生成
