# 共通型定義

複数ドメインで共有する値オブジェクトを定義する。これらの型は `src/core/domain/shared/` に配置する。

## 値オブジェクト

### DocumentId

ドキュメントの一意識別子。Document, VectorIndex, Answerドメインで使用する。

```typescript
type DocumentId = string & { readonly brand: "DocumentId" };

function createDocumentId(value: string): DocumentId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError("INVALID_DOCUMENT_ID", "DocumentId cannot be empty");
  }
  return value as DocumentId;
}
```

**使用箇所**:
- Document: ドキュメントの識別
- VectorIndex: インデックスエントリとドキュメントの紐付け
- Answer: 回答ソースのドキュメント参照

**同期時の削除戦略**:

同期処理では「全削除→全挿入」方式を採用する。

- **方式**: 全削除→全挿入
- **理由**: 外部APIから削除されたドキュメントも確実に削除するため
- **実装**: DocumentRepository.deleteAll()で全ドキュメントを削除後、saveManyで全挿入

```typescript
// DocumentRepositoryのインターフェース
interface DocumentRepository {
  /**
   * 全ドキュメントを削除する
   * @throws SystemError - 削除に失敗した場合
   */
  deleteAll(): Promise<void>;

  /**
   * 複数ドキュメントを保存する（INSERT）
   * @throws SystemError - 保存に失敗した場合
   */
  saveMany(documents: Document[]): Promise<void>;

  // ... 他のメソッド
}

// DocumentRepositoryの実装例
async deleteAll(): Promise<void> {
  await this.db.delete(documents);
}

async saveMany(documents: Document[]): Promise<void> {
  await this.db.insert(documents)
    .values(documents.map(documentToRow));
}
```

### SimilarityScore

類似度スコア（0-1の範囲）。VectorIndex, Answerドメインで使用する。

```typescript
type SimilarityScore = number & { readonly brand: "SimilarityScore" };

function createSimilarityScore(value: number): SimilarityScore {
  if (value < 0 || value > 1) {
    throw new BusinessRuleError("INVALID_SIMILARITY_SCORE", "SimilarityScore must be between 0 and 1");
  }
  return value as SimilarityScore;
}
```

**使用箇所**:
- VectorIndex: 検索結果のスコア
- Answer: 回答ソースの関連度

## ID生成規則

各エンティティのID生成方法を定義する。

### 基本方針

- **基本**: UUID v7を使用（時刻順でソート可能）
- **特別な場合**: 意味を持たせる必要がある場合のみカスタム形式を使用

### 各IDの生成方法

| ID型 | 生成方法 | 説明 |
|------|---------|------|
| DocumentId | 外部APIのIDをそのまま使用 | 外部システムとの整合性を保つため |
| VectorIndexEntryId | UUID v7 | チャンク単位で一意に識別 |
| AnswerId | UUID v7 | 回答を一意に識別 |
| AnswerSourceId | `${answerId}-source-${index}` | 回答との関連を明示するため（indexは0-indexed） |

### 実装例

```typescript
import { uuidv7 } from "uuidv7";

// UUID v7を使用
function generateAnswerId(): AnswerId {
  return uuidv7() as AnswerId;
}

function generateVectorIndexEntryId(): VectorIndexEntryId {
  return uuidv7() as VectorIndexEntryId;
}

// カスタム形式
function generateAnswerSourceId(answerId: AnswerId, index: number): AnswerSourceId {
  return `${answerId}-source-${index}` as AnswerSourceId;
}
```

## アプリケーション層インターフェース

### UnitOfWork

トランザクション境界を管理するインターフェース。

```typescript
interface UnitOfWork {
  /**
   * トランザクション内で処理を実行する
   * @param fn - トランザクション内で実行する処理
   * @returns 処理結果
   * @throws SystemError - トランザクションの開始/コミット/ロールバックに失敗した場合
   */
  run<T>(fn: () => Promise<T>): Promise<T>;
}
```

**設計意図**:
- アプリケーション層がトランザクション境界を明示的に制御
- インフラストラクチャ層の実装詳細（PostgreSQLのトランザクション等）を抽象化
- ネストされたトランザクション（Savepoint）は現時点ではサポート外

### ApplicationContext

アプリケーション層で使用するポートとサービスを集約した型。依存性注入に使用する。

```typescript
type ApplicationContext = {
  // トランザクション管理
  unitOfWork: UnitOfWork;

  // Documentドメインのポート
  documentListFetcher: DocumentListFetcher;
  documentContentFetcher: DocumentContentFetcher;
  documentParser: DocumentParser;
  documentRepository: DocumentRepository;

  // VectorIndexドメインのポート
  textSplitter: TextSplitter;
  embeddingGenerator: EmbeddingGenerator;
  vectorStore: VectorStore;

  // Answerドメインのポート
  answerGenerator: AnswerGenerator;
  answerRepository?: AnswerRepository;  // オプショナル: 初期実装では省略可能

  // Messageドメインのポート
  messageSender: MessageSender;
};
```

**設定の管理**:

アプリケーション設定はTypeScriptの型付き定数として管理する。

- **機密情報**: 環境変数から読み込み（APIキー、トークン等）
- **非機密情報**: TypeScriptファイルで定数として定義

```typescript
// src/config.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL!, // 環境変数
    poolSize: 10,
  },
  vectorIndex: {
    chunkSize: 1000,
    chunkOverlap: 200,
    topK: 5,
  },
  // ...
} as const;
```

DIコンテナ生成時に設定値を使用してアダプターを初期化する。

**使用例**:
```typescript
// SyncAndBuildIndexユースケースでの使用
async function syncAndBuildIndex(
  eventSource: EventSource,
  context: ApplicationContext
): Promise<void> {
  // インデックス構築フェーズ（単一トランザクション）
  await context.unitOfWork.run(async () => {
    await context.vectorStore.clear();
    const documents = await context.documentRepository.findAll();
    // ... チャンク分割、埋め込み生成 ...
    await context.vectorStore.add(entries);
  });
}
```

**実装パス**:
- `src/core/application/unitOfWork.ts`（UnitOfWorkインターフェース定義）
- `src/core/application/context.ts`（ApplicationContext型定義）

## 実装パス

共通型定義は以下のパスに配置する。

```
src/core/domain/shared/
├── index.ts          # 再エクスポート
├── documentId.ts     # DocumentId型定義
└── similarityScore.ts # SimilarityScore型定義

src/core/application/
├── unitOfWork.ts     # UnitOfWorkインターフェース
└── context.ts        # ApplicationContext型定義（UnitOfWorkを含む）
```

## 各ドメインでの参照方法

各ドメインでは、共通型をインポートして使用する。

```typescript
// src/core/domain/document/entity.ts
import { DocumentId } from "../shared";

// src/core/domain/vectorIndex/entity.ts
import { DocumentId, SimilarityScore } from "../shared";

// src/core/domain/answer/entity.ts
import { DocumentId, SimilarityScore } from "../shared";

// src/core/application/syncAndBuildIndex.ts
import { EventSource, getEventSourceDestination } from "../domain/message";
```

## 型定義の移動

以下の型定義は各ドメインから共通モジュールに移動する。

| 型 | 移動元 | 移動先 |
|----|-------|-------|
| DocumentId | Document, VectorIndex, Answer | shared |
| SimilarityScore | VectorIndex, Answer | shared |

## エラーコードと例外クラスの対応

エラーコードと例外クラスの対応関係を定義する。

### 例外クラス一覧

**ドメイン層**:
- `BusinessRuleError`: ビジネスルール違反

**アプリケーション層**:
- `ValidationError`: 入力バリデーションエラー
- `NotFoundError`: リソースが見つからない
- `ConflictError`: リソースの競合
- `SystemError`: 外部システムエラー（API、DB等）

### エラーコードと例外の対応表

#### Documentドメイン

| エラーコード | 例外クラス | 説明 |
|------------|-----------|------|
| DOCUMENT_FETCH_FAILED | SystemError | ドキュメント取得失敗（ネットワーク等） |
| DOCUMENT_LIST_FETCH_FAILED | SystemError | ドキュメント一覧取得失敗 |
| DOCUMENT_CONTENT_FETCH_FAILED | SystemError | ドキュメント内容取得失敗 |
| DOCUMENT_PARSE_FAILED | ValidationError | パース失敗 |
| DOCUMENT_INVALID_JSON_FORMAT | ValidationError | 不正なJSON形式 |
| DOCUMENT_INVALID_HTML_FORMAT | ValidationError | 不正なHTML形式 |
| DOCUMENT_FIELD_NOT_FOUND | ValidationError | 必須フィールドが見つからない |
| DOCUMENT_SELECTOR_NOT_FOUND | ValidationError | CSSセレクタが見つからない |
| DOCUMENT_SAVE_FAILED | SystemError | ドキュメント保存失敗 |
| DOCUMENT_INVALID_URL | ValidationError | 不正なURL形式 |
| DOCUMENT_EMPTY_CONTENT | ValidationError | 空のコンテンツ |

#### VectorIndexドメイン

| エラーコード | 例外クラス | 説明 |
|------------|-----------|------|
| VECTOR_INDEX_EMBEDDING_GENERATION_FAILED | SystemError | 埋め込み生成失敗 |
| VECTOR_INDEX_ADD_FAILED | SystemError | インデックス追加失敗 |
| VECTOR_INDEX_SEARCH_FAILED | SystemError | インデックス検索失敗 |
| VECTOR_INDEX_DELETE_FAILED | SystemError | インデックス削除失敗 |
| VECTOR_INDEX_CLEAR_FAILED | SystemError | インデックスクリア失敗 |
| VECTOR_INDEX_NOT_FOUND | NotFoundError | インデックスが見つからない |
| VECTOR_INDEX_EMPTY | NotFoundError | インデックスが空 |
| VECTOR_INDEX_INVALID_TOP_K | ValidationError | 不正なTopK値 |
| VECTOR_INDEX_INVALID_EMBEDDING | ValidationError | 不正な埋め込みベクトル |
| VECTOR_INDEX_INVALID_CHUNK_INDEX | ValidationError | 不正なチャンクインデックス |

#### Answerドメイン

| エラーコード | 例外クラス | 説明 |
|------------|-----------|------|
| ANSWER_CONTEXT_RETRIEVAL_FAILED | SystemError | コンテキスト取得失敗 |
| ANSWER_NO_RELEVANT_DOCUMENTS | NotFoundError | 関連ドキュメントなし |
| ANSWER_GENERATION_FAILED | SystemError | 回答生成失敗 |
| ANSWER_LLM_API_ERROR | SystemError | LLM API呼び出し失敗 |
| ANSWER_INDEX_NOT_AVAILABLE | NotFoundError | インデックスが利用不可 |
| ANSWER_SAVE_FAILED | SystemError | 回答保存失敗 |
| ANSWER_EMPTY_QUESTION | ValidationError | 空の質問 |
| ANSWER_EMPTY_CONTENT | ValidationError | 空の回答コンテンツ |

#### Messageドメイン

| エラーコード | 例外クラス | 説明 |
|------------|-----------|------|
| MESSAGE_REPLY_FAILED | SystemError | 返信送信失敗 |
| MESSAGE_PUSH_FAILED | SystemError | プッシュ送信失敗 |
| MESSAGE_TOO_LONG | ValidationError | メッセージが長すぎる |
| MESSAGE_INVALID_REPLY_TOKEN | ValidationError | 不正なリプライトークン |
| MESSAGE_EXPIRED_REPLY_TOKEN | ValidationError | 期限切れのリプライトークン |
| MESSAGE_INVALID_EVENT_SOURCE | BusinessRuleError | 不正なEventSource（必須フィールドの欠落） |

### 例外の使い分けガイドライン

1. **ValidationError**: 入力データの形式や値が不正な場合
   - ユーザー入力の検証失敗
   - パース処理での形式エラー

2. **NotFoundError**: 必要なリソースが存在しない場合
   - インデックス未構築
   - 検索結果なし

3. **SystemError**: 外部システムとの通信エラー
   - API呼び出し失敗
   - DB操作失敗
   - ネットワークエラー

4. **BusinessRuleError**: ドメイン固有のビジネスルール違反
   - 値オブジェクトの制約違反
   - 集約の不変条件違反
