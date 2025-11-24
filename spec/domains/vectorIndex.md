# VectorIndex ドメイン

ベクトルインデックスの管理と質問応答に関するドメイン。RAGフレームワークを抽象化し、インデックスの構築・検索・回答生成を担当する。

## 概要

VectorIndexドメインは、RAG（Retrieval-Augmented Generation）の基盤機能を提供する。LlamaIndex等のRAGフレームワークを抽象化し、以下の機能を統合的に提供する：

- ドキュメントのチャンク分割
- 埋め込みベクトルの生成
- ベクトルストアへの保存・検索
- LLMによる回答生成
- 回答エンティティの管理

## エンティティ

### Answer

生成された回答を表す。

```typescript
type Answer = Readonly<{
  id: AnswerId;
  question: Question;
  content: AnswerContent;
  sources: AnswerSource[];
  generatedAt: Date;
}>;

function createAnswer(params: {
  id: AnswerId;
  question: Question;
  content: AnswerContent;
  sources: AnswerSource[];
  generatedAt: Date;
}): Answer {
  // 空の質問をチェック
  if (!params.question || (params.question as string).trim() === "") {
    throw new BusinessRuleError("VECTOR_INDEX_EMPTY_QUESTION", "Question cannot be empty");
  }
  // 空の回答内容をチェック
  if (!params.content || (params.content as string).trim() === "") {
    throw new BusinessRuleError("VECTOR_INDEX_EMPTY_CONTENT", "Answer content cannot be empty");
  }
  return params;
}

function createNoRelevantDocumentsAnswer(id: AnswerId, question: Question): Answer {
  return {
    id,
    question,
    content: "該当する情報が見つかりませんでした。質問を変えてお試しください。" as AnswerContent,
    sources: [],
    generatedAt: new Date(),
  };
}

function createIndexNotBuiltAnswer(id: AnswerId, question: Question): Answer {
  return {
    id,
    question,
    content: "インデックスが構築されていません。先にsyncコマンドを実行してください。" as AnswerContent,
    sources: [],
    generatedAt: new Date(),
  };
}
```

### AnswerSource

回答の根拠となったソース情報を表す。

```typescript
type AnswerSource = Readonly<{
  id: AnswerSourceId;
  documentId: DocumentId;
  documentTitle: string;
  relevantContent: string;
  score: SimilarityScore;
}>;
```

## 値オブジェクト

### AnswerId

回答の一意識別子。

```typescript
type AnswerId = string & { readonly brand: "AnswerId" };
```

### AnswerSourceId

回答ソースの一意識別子。

```typescript
type AnswerSourceId = string & { readonly brand: "AnswerSourceId" };
```

### Question

ユーザーからの質問。

```typescript
type Question = string & { readonly brand: "Question" };
```

### AnswerContent

回答の本文。

```typescript
type AnswerContent = string & { readonly brand: "AnswerContent" };
```

### IndexDocument

インデックス構築用のドキュメント入力型。

```typescript
type IndexDocument = Readonly<{
  id: DocumentId;
  title: string;
  content: string;
}>;
```

### QuerySource

検索結果のソース情報。

```typescript
type QuerySource = Readonly<{
  documentId: DocumentId;
  documentTitle: string;
  relevantContent: string;
  score: SimilarityScore;
}>;
```

### QueryResult

検索と回答生成の結果。

```typescript
type QueryResult = Readonly<{
  answer: string;
  sources: QuerySource[];
}>;
```

### IndexStatus

インデックスの状態情報。

```typescript
type IndexStatus = Readonly<{
  entryCount: number;
  lastUpdatedAt: Date | null;
  isAvailable: boolean;
}>;
```

**lastUpdatedAtの取得方法**:

lastUpdatedAtはDocumentRepositoryから最大のfetchedAtを取得して使用する。IndexBuilder.getStatus()の実装では、以下のいずれかの方法で取得する：

1. **推奨**: DocumentRepositoryの最大fetchedAtを使用
   - 理由: ドキュメントの最終同期日時がインデックスの鮮度を最も正確に表す
   - UC-STATUS-001でDocumentRepositoryにアクセスできるため、アプリケーション層で取得可能

2. **代替案**: LlamaIndexのノードメタデータから取得
   - LlamaIndexテーブルに直接クエリを発行して最新のcreated_atを取得
   - 実装がLlamaIndexの内部構造に依存するため、推奨しない

**実装例**（アプリケーション層）:
```typescript
async function checkStatus(container: Container): Promise<void> {
  const status = await container.indexBuilder.getStatus();
  const lastFetchedAt = await container.unitOfWork.run(async ({ documentRepository }) => {
    return documentRepository.getLastFetchedAt(); // 最大のfetchedAtを返す
  });

  const statusWithDate = {
    ...status,
    lastUpdatedAt: lastFetchedAt,
  };
}
```

### IndexBuildResult

インデックス構築の結果。

```typescript
type IndexBuildResult = Readonly<{
  totalDocuments: number;
  totalEntries: number; // 概算値。LlamaIndex等のフレームワークが内部でチャンク分割するため、正確な値を取得困難な場合がある
  buildDuration: number;
}>;
```

## エラーコード

VectorIndexドメインで使用するエラーコード。

```typescript
const VectorIndexErrorCode = {
  // 埋め込み生成エラー
  EMBEDDING_GENERATION_FAILED: "VECTOR_INDEX_EMBEDDING_GENERATION_FAILED",

  // インデックス操作エラー
  ADD_FAILED: "VECTOR_INDEX_ADD_FAILED",
  SEARCH_FAILED: "VECTOR_INDEX_SEARCH_FAILED",
  DELETE_FAILED: "VECTOR_INDEX_DELETE_FAILED",
  CLEAR_FAILED: "VECTOR_INDEX_CLEAR_FAILED",
  BUILD_FAILED: "VECTOR_INDEX_BUILD_FAILED",

  // 状態エラー
  NOT_FOUND: "VECTOR_INDEX_NOT_FOUND",
  EMPTY: "VECTOR_INDEX_EMPTY",
  NOT_AVAILABLE: "VECTOR_INDEX_NOT_AVAILABLE",

  // バリデーションエラー
  INVALID_TOP_K: "VECTOR_INDEX_INVALID_TOP_K",
  INVALID_EMBEDDING: "VECTOR_INDEX_INVALID_EMBEDDING",
  INVALID_CHUNK_INDEX: "VECTOR_INDEX_INVALID_CHUNK_INDEX",
  INVALID_VECTOR_INDEX_ENTRY_ID: "VECTOR_INDEX_INVALID_VECTOR_INDEX_ENTRY_ID",
  INVALID_TEXT_SPLITTER_CONFIG: "VECTOR_INDEX_INVALID_TEXT_SPLITTER_CONFIG",

  // 回答関連エラー
  CONTEXT_RETRIEVAL_FAILED: "VECTOR_INDEX_CONTEXT_RETRIEVAL_FAILED",
  NO_RELEVANT_DOCUMENTS: "VECTOR_INDEX_NO_RELEVANT_DOCUMENTS",
  GENERATION_FAILED: "VECTOR_INDEX_GENERATION_FAILED",
  LLM_API_ERROR: "VECTOR_INDEX_LLM_API_ERROR",
  EMPTY_QUESTION: "VECTOR_INDEX_EMPTY_QUESTION",
  EMPTY_CONTENT: "VECTOR_INDEX_EMPTY_CONTENT",
} as const;

type VectorIndexErrorCode = typeof VectorIndexErrorCode[keyof typeof VectorIndexErrorCode];
```

## ポート

### IndexBuilder

インデックスの構築・管理を担当するポート。

```typescript
interface IndexBuilder {
  /**
   * ドキュメントからインデックスを構築する
   * 既存のインデックスは全て削除され、新しいインデックスで置き換えられる
   * @throws SystemError - インデックス構築に失敗した場合
   */
  buildIndex(documents: IndexDocument[]): Promise<IndexBuildResult>;

  /**
   * インデックスをクリアする
   * @throws SystemError - クリアに失敗した場合
   */
  clearIndex(): Promise<void>;

  /**
   * インデックスの状態を取得する
   * @throws SystemError - 状態取得に失敗した場合
   */
  getStatus(): Promise<IndexStatus>;
}
```

**使用ユースケース**: UC-SYNC-001, UC-STATUS-001

### QueryEngine

検索と回答生成を担当するポート。

```typescript
interface QueryEngine {
  /**
   * 質問に対して検索と回答生成を実行する
   * @param question - ユーザーの質問
   * @param topK - 取得する類似ドキュメント数
   * @throws NotFoundError - インデックスが利用不可の場合
   * @throws SystemError - 検索または回答生成に失敗した場合
   */
  query(question: string, topK: number): Promise<QueryResult>;
}
```

**使用ユースケース**: UC-QA-001

## LlamaIndexアダプターの実装

各ポートを個別のアダプターで実装する。設定は共通型を使用する。

### IndexBuilder実装

```typescript
// src/core/adapters/llamaindex/indexBuilder.ts
import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { PGVectorStore } from "@llamaindex/postgres";
import { Settings, VectorStoreIndex, Document, storageContextFromDefaults } from "llamaindex";

type LlamaIndexIndexBuilderConfig = {
  openaiApiKey: string;
  databaseUrl: string;
  llmModel?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  tableName?: string;
  schemaName?: string;
};

class LlamaIndexIndexBuilder implements IndexBuilder {
  private vectorStore: PGVectorStore;

  constructor(private readonly config: LlamaIndexIndexBuilderConfig) {
    Settings.llm = new OpenAI({ model: config.llmModel ?? "gpt-4o-mini", apiKey: config.openaiApiKey });
    Settings.embedModel = new OpenAIEmbedding({ model: config.embeddingModel ?? "text-embedding-3-small", apiKey: config.openaiApiKey });
    Settings.chunkSize = config.chunkSize ?? 1000;
    Settings.chunkOverlap = config.chunkOverlap ?? 200;

    this.vectorStore = new PGVectorStore({
      clientConfig: { connectionString: config.databaseUrl },
      schemaName: config.schemaName ?? "public",
      tableName: config.tableName ?? "llamaindex_vectors",
    });
  }

  async buildIndex(documents: IndexDocument[]): Promise<IndexBuildResult> {
    const startTime = Date.now();
    await this.clearIndex();

    const llamaDocs = documents.map(doc => new Document({
      text: doc.content,
      id_: doc.id,
      metadata: { documentId: doc.id, title: doc.title },
    }));

    const storageContext = await storageContextFromDefaults({ vectorStore: this.vectorStore });
    await VectorStoreIndex.fromDocuments(llamaDocs, { storageContext });

    return {
      totalDocuments: documents.length,
      totalEntries: documents.length, // 概算
      buildDuration: Date.now() - startTime,
    };
  }

  async clearIndex(): Promise<void> {
    // DBから直接TRUNCATEを実行
  }

  async getStatus(): Promise<IndexStatus> {
    // DBから直接COUNTを取得
  }
}
```

### QueryEngine実装

```typescript
// src/core/adapters/llamaindex/queryEngine.ts
import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { PGVectorStore } from "@llamaindex/postgres";
import { Settings, VectorStoreIndex } from "llamaindex";

type LlamaIndexQueryEngineConfig = {
  openaiApiKey: string;
  databaseUrl: string;
  llmModel?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  tableName?: string;
  schemaName?: string;
};

class LlamaIndexQueryEngine implements QueryEngine {
  private vectorStore: PGVectorStore;

  constructor(private readonly config: LlamaIndexQueryEngineConfig) {
    Settings.llm = new OpenAI({ model: config.llmModel ?? "gpt-4o-mini", apiKey: config.openaiApiKey });
    Settings.embedModel = new OpenAIEmbedding({ model: config.embeddingModel ?? "text-embedding-3-small", apiKey: config.openaiApiKey });
    Settings.chunkSize = config.chunkSize ?? 1000;
    Settings.chunkOverlap = config.chunkOverlap ?? 200;

    this.vectorStore = new PGVectorStore({
      clientConfig: { connectionString: config.databaseUrl },
      schemaName: config.schemaName ?? "public",
      tableName: config.tableName ?? "llamaindex_vectors",
    });
  }

  async query(question: string, topK: number): Promise<QueryResult> {
    // DBからインデックスを復元
    const index = await VectorStoreIndex.fromVectorStore(this.vectorStore);
    const queryEngine = index.asQueryEngine({ similarityTopK: topK });
    const response = await queryEngine.query({ query: question });

    const sources = response.sourceNodes?.map(node => ({
      documentId: node.node.metadata.documentId as DocumentId,
      documentTitle: node.node.metadata.title as string,
      relevantContent: node.node.text,
      score: createSimilarityScore(node.score ?? 0),
    })) ?? [];

    return {
      answer: response.response,
      sources,
    };
  }
}
```

## Containerでの使用

```typescript
type Container = {
  // トランザクション管理
  unitOfWork: UnitOfWork;

  // 共通ポート
  logger: Logger;

  // Documentドメインのポート
  documentSource: DocumentSource;

  // VectorIndexドメインのポート
  indexBuilder: IndexBuilder;
  queryEngine: QueryEngine;

  // Messageドメインのポート
  messageSender: MessageSender;
};
```

## ユースケースでの使用例

### UC-SYNC-001: ドキュメント同期

```typescript
async function syncAndBuildIndex(
  eventSource: EventSource,
  replyToken: ReplyToken,
  container: Container
): Promise<void> {
  // ドキュメント取得（取得・パースはDocumentSource内部で行われる）
  const documents: Document[] = [];
  const results: Array<{ id: DocumentId; success: boolean }> = [];

  for await (const doc of container.documentSource.iterate()) {
    documents.push(doc);
    results.push({ id: doc.id, success: true });
  }

  const syncResult = createSyncResult(results);

  // インデックス構築
  const indexDocuments = documents.map(doc => ({
    id: doc.id,
    title: doc.title as string,
    content: doc.content as string,
  }));

  const buildResult = await container.indexBuilder.buildIndex(indexDocuments);

  // 結果通知
  const message = createBuildResultMessage(syncResult, buildResult);
  await container.messageSender.push(destination, message);
}
```

### UC-QA-001: 質問応答

```typescript
async function answerQuestion(
  question: Question,
  replyToken: ReplyToken,
  container: Container
): Promise<void> {
  // インデックス検索と回答生成
  const queryResult = await container.queryEngine.query(question as string, topK);

  // Answerエンティティを作成
  const sources = queryResult.sources.map((source, index) => ({
    id: generateAnswerSourceId(answerId, index),
    documentId: source.documentId,
    documentTitle: source.documentTitle,
    relevantContent: source.relevantContent,
    score: source.score,
  }));

  const answer = createAnswer({
    id: answerId,
    question,
    content: createAnswerContent(queryResult.answer),
    sources,
    generatedAt: new Date(),
  });

  // 回答を返信
  await container.messageSender.reply(replyToken, answer.content as string);
}
```

### UC-STATUS-001: ステータス確認

```typescript
async function checkStatus(
  replyToken: ReplyToken,
  container: Container
): Promise<void> {
  const status = await container.indexBuilder.getStatus();
  const documentCount = await container.unitOfWork.run(async ({ documentRepository }) => {
    return documentRepository.count();
  });

  const message = createStatusMessage(documentCount, status);
  await container.messageSender.reply(replyToken, message);
}
```

## 実装パス

```
src/core/domain/vectorIndex/
├── index.ts              # 再エクスポート
├── entity.ts             # Answer, AnswerSource
├── valueObject.ts        # AnswerId, Question, AnswerContent, IndexDocument, QuerySource, QueryResult, IndexStatus, IndexBuildResult
├── errorCode.ts          # VectorIndexErrorCode
└── ports/
    ├── indexBuilder.ts   # IndexBuilderポート定義
    └── queryEngine.ts    # QueryEngineポート定義

src/core/adapters/llamaindex/
├── indexBuilder.ts   # LlamaIndexIndexBuilder実装
└── queryEngine.ts    # LlamaIndexQueryEngine実装
```

## 設計上の注意点

### ポートとアダプターの分離

`IndexBuilder`と`QueryEngine`を別々のポート・アダプターとして実装する理由：

1. **単一責任の原則**: 各ポートが明確な責務を持つ
2. **テスト容易性**: 各機能を独立してモック/テスト可能
3. **拡張性**: 将来的に異なる実装（例: BM25検索）を追加しやすい
4. **ステートレス**: データはDBに永続化されるため、アダプター間で状態を共有する必要がない

### 設定の一貫性

両アダプターに同じ設定を渡すことで、モデル設定の整合性を保つ：

```typescript
const vectorIndexConfig = {
  openaiApiKey,
  databaseUrl,
  embeddingModel: "text-embedding-3-small",
  llmModel: "gpt-4o-mini",
  chunkSize: 1000,
  chunkOverlap: 200,
  tableName: "llamaindex_vectors",
};

return {
  indexBuilder: new LlamaIndexIndexBuilder(vectorIndexConfig),
  queryEngine: new LlamaIndexQueryEngine(vectorIndexConfig),
};
```

### AnswerエンティティとQueryResultの関係

- QueryEngineは検索結果と生成された回答文字列を返す（QueryResult）
- アプリケーション層がQueryResultをAnswerエンティティに変換
- Answerエンティティのファクトリ関数がバリデーションを担当
