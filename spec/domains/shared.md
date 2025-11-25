# 共通型定義

複数ドメインで共有する値オブジェクトを定義する。これらの型は `src/core/domain/shared/` に配置する。

## 値オブジェクト

### DocumentId

ドキュメントの一意識別子。Document, VectorIndexドメインで使用する。

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
- VectorIndex: インデックスエントリとドキュメントの紐付け、回答ソースのドキュメント参照

### SimilarityScore

類似度スコア（0-1の範囲）。Answer, VectorIndexドメインで使用する。

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
- VectorIndex: 検索結果のスコア（QuerySource.score）、回答ソースの関連度（AnswerSource.score）

## ID生成規則

各エンティティのID生成方法を定義する。

### 基本方針

- **基本**: UUID v7を使用（時刻順でソート可能）
- **特別な場合**: 意味を持たせる必要がある場合のみカスタム形式を使用

### 各IDの生成方法

| ID型 | 生成方法 | 説明 |
|------|---------|------|
| DocumentId | 外部APIのIDをそのまま使用 | 外部システムとの整合性を保つため |
| AnswerId | UUID v7 | 回答を一意に識別（VectorIndexドメイン） |
| AnswerSourceId | `${answerId}-source-${index}` | 回答との関連を明示するため（indexは0-indexed、VectorIndexドメイン） |

**注記**: ベクトルインデックスエントリのIDはVectorIndexアダプター内部で生成される（UUID v7）。

### 実装例

```typescript
import { uuidv7 } from "uuidv7";

// UUID v7を使用
function generateAnswerId(): AnswerId {
  return uuidv7() as AnswerId;
}

// カスタム形式
function generateAnswerSourceId(answerId: AnswerId, index: number): AnswerSourceId {
  return `${answerId}-source-${index}` as AnswerSourceId;
}
```

## アプリケーション層インターフェース

### Container

アプリケーション層で使用するポートとサービスを集約した型。依存性注入に使用する。

**注記**: 以前は`ApplicationContext`という名前だったが、`Container`に変更された。

```typescript
type Container = {
  // アプリケーション設定
  config: AppConfig;

  // 共通ポート
  logger: Logger;

  // Documentドメインのポート
  documentSource: DocumentSource;

  // VectorIndexドメインのポート
  indexBuilder: IndexBuilder;
  queryEngine: QueryEngine;

  // Messageドメインのポート
  messageSender: MessageSender;  // 動的コンテンツ（LLMの回答など）
  userNotifier: UserNotifier;    // 定型通知（テンプレートベース）
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
// SyncDocumentsユースケースでの使用
async function syncDocuments(
  container: Container,
  input: SyncDocumentsInput
): Promise<SyncDocumentsOutput> {
  // ドキュメントを取得（メモリ上で処理）
  const documents: Document[] = [];
  for await (const doc of container.documentSource.iterate()) {
    documents.push(doc);
  }

  // インデックス構築
  const indexDocuments = documents.map(toIndexDocument);
  const buildResult = await container.indexBuilder.buildIndex(indexDocuments);

  // 結果を返す
  return { /* ... */ };
}
```

**実装パス**:
- `src/core/application/container.ts`（Container型定義）

## Loggerポート

アプリケーション全体で使用するロギングインターフェース。エラーハンドリングや運用監視のためのログ出力を担当する。

```typescript
interface Logger {
  /**
   * デバッグログを出力する
   * 開発時のトレース用。本番環境では通常無効化される
   */
  debug(message: string, context?: Record<string, unknown>): void;

  /**
   * 情報ログを出力する
   * 正常な処理フローの記録用
   */
  info(message: string, context?: Record<string, unknown>): void;

  /**
   * 警告ログを出力する
   * 処理は継続可能だが注意が必要な状況
   */
  warn(message: string, context?: Record<string, unknown>): void;

  /**
   * エラーログを出力する
   * 処理が失敗した状況
   * @param message - ログメッセージ
   * @param error - エラーオブジェクト（Errorインスタンスまたはunknown）
   * @param context - 追加のコンテキスト情報
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}
```

**設計意図**:
- シンプルなインターフェースを採用し、アダプター実装の自由度を高める
- コンテキストは`Record<string, unknown>`として柔軟に拡張可能
- エラーログはエラーオブジェクトを別引数として受け取り、スタックトレースの取得を容易にする

**出力形式**:
- 開発環境: 人間が読みやすいテキスト形式
- 本番環境: JSON形式（CloudWatch, Datadog等への連携用）

**ログ出力例**:
```json
{
  "level": "error",
  "message": "Failed to fetch document content",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "requestId": "req-abc123",
  "errorCode": "DOCUMENT_CONTENT_FETCH_FAILED",
  "errorMessage": "Connection timeout",
  "usecase": "UC-SYNC-001",
  "operation": "fetchDocumentContent",
  "documentId": "doc-456"
}
```

**使用ガイドライン**:

1. **infoレベル**: ユースケースの開始・終了、重要な処理の完了
2. **warnレベル**: リトライ発生、部分的な失敗（処理は継続）
3. **errorレベル**: 処理の失敗、例外のキャッチ

**実装パス**: `src/core/domain/shared/ports/logger.ts`

## 実装パス

共通型定義は以下のパスに配置する。

```
src/core/domain/shared/
├── index.ts              # 再エクスポート
├── documentId.ts         # DocumentId型定義
├── similarityScore.ts    # SimilarityScore型定義
└── ports/
    └── logger.ts         # Loggerポート定義

src/core/application/
└── container.ts      # Container型定義
```

## 各ドメインでの参照方法

各ドメインでは、共通型をインポートして使用する。

```typescript
// src/core/domain/document/entity.ts
import { DocumentId } from "../shared";

// src/core/domain/vectorIndex/valueObject.ts
import { DocumentId, SimilarityScore } from "../shared";

// src/core/application/syncAndBuildIndex.ts
import { EventSource, getEventSourceDestination } from "../domain/message";
```

## 型定義の配置

以下の型定義は各ドメインで使用される共通型として定義する。

| 型 | 配置場所 | 使用ドメイン |
|----|---------|------------|
| DocumentId | shared | Document, VectorIndex |
| SimilarityScore | shared | VectorIndex |

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
| VECTOR_INDEX_BUILD_FAILED | SystemError | インデックス構築失敗 |
| VECTOR_INDEX_NOT_FOUND | NotFoundError | インデックスが見つからない |
| VECTOR_INDEX_EMPTY | NotFoundError | インデックスが空 |
| VECTOR_INDEX_NOT_AVAILABLE | NotFoundError | インデックスが利用不可 |
| VECTOR_INDEX_INVALID_TOP_K | ValidationError | 不正なTopK値 |
| VECTOR_INDEX_INVALID_EMBEDDING | ValidationError | 不正な埋め込みベクトル |
| VECTOR_INDEX_INVALID_CHUNK_INDEX | ValidationError | 不正なチャンクインデックス |
| VECTOR_INDEX_CONTEXT_RETRIEVAL_FAILED | SystemError | コンテキスト取得失敗 |
| VECTOR_INDEX_NO_RELEVANT_DOCUMENTS | NotFoundError | 関連ドキュメントなし |
| VECTOR_INDEX_GENERATION_FAILED | SystemError | 回答生成失敗 |
| VECTOR_INDEX_LLM_API_ERROR | SystemError | LLM API呼び出し失敗 |
| VECTOR_INDEX_EMPTY_QUESTION | ValidationError | 空の質問 |
| VECTOR_INDEX_EMPTY_CONTENT | ValidationError | 空の回答コンテンツ |

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
