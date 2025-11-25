# Document ドメイン

ドキュメントの取得とパースに関するドメイン。外部APIからのドキュメント取得、各種形式のパース処理を担当する。

## エンティティ

### Document

パース済みのドキュメントを表す。

```typescript
type Document = Readonly<{
  id: DocumentId;
  title: DocumentTitle;
  content: DocumentContent;
  metadata: DocumentMetadata;
  fetchedAt: Date;
}>;

function createDocument(params: {
  id: DocumentId;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  fetchedAt: Date;
}): Document {
  if (!params.content || params.content.trim() === "") {
    throw new BusinessRuleError("DOCUMENT_EMPTY_CONTENT", "Document content cannot be empty");
  }
  return {
    id: params.id,
    title: params.title as DocumentTitle,
    content: params.content as DocumentContent,
    metadata: params.metadata,
    fetchedAt: params.fetchedAt,
  };
}
```

## 値オブジェクト

### DocumentId

ドキュメントの一意識別子。共通型定義（`shared`）を参照する。

```typescript
// src/core/domain/shared/documentId.ts から参照
type DocumentId = string & { readonly brand: "DocumentId" };
```

### DocumentTitle

ドキュメントのタイトル。

```typescript
type DocumentTitle = string & { readonly brand: "DocumentTitle" };
```

### DocumentContent

ドキュメントの本文。

```typescript
type DocumentContent = string & { readonly brand: "DocumentContent" };
```

### DocumentUrl

ドキュメント取得用のURL。

```typescript
type DocumentUrl = string & { readonly brand: "DocumentUrl" };

function createDocumentUrl(value: string): DocumentUrl {
  // URL形式を検証
  try {
    new URL(value);
  } catch {
    throw new BusinessRuleError("DOCUMENT_INVALID_URL", "Invalid URL format");
  }
  return value as DocumentUrl;
}
```

### DocumentMetadata

ドキュメントのメタデータ。

```typescript
type DocumentMetadata = Readonly<{
  sourceUrl: DocumentUrl;
  additionalData: Readonly<Record<string, string | number | boolean | null>>;
}>;
```

**設計意図**:
- 必須のメタデータフィールドを明示的に定義
- `fetchedAt`はDocumentエンティティのトップレベルに持ち、重複を避ける
- 追加データは `additionalData` に型安全なプリミティブ値のみを許容
- `unknown` の使用を避け、型の一貫性を保証

**additionalDataの型制限について**:
- 現在はプリミティブ値のみ許容（`string | number | boolean | null`）
- ネストされたオブジェクトや配列は許容しない
- JSONBとしてDBに保存されるため、技術的には複雑な構造も保存可能
- 将来ネストが必要になった場合は、`Json`型への変更を検討する

```typescript
// 将来の拡張例（必要に応じて）
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type DocumentMetadata = Readonly<{
  sourceUrl: DocumentUrl;
  additionalData: Readonly<Record<string, JsonValue>>;
}>;
```

## エラーコード

Documentドメインで使用するエラーコード。

```typescript
const DocumentErrorCode = {
  // 取得エラー
  FETCH_FAILED: "DOCUMENT_FETCH_FAILED",

  // 永続化エラー
  SAVE_FAILED: "DOCUMENT_SAVE_FAILED",

  // バリデーションエラー
  INVALID_URL: "DOCUMENT_INVALID_URL",
  EMPTY_CONTENT: "DOCUMENT_EMPTY_CONTENT",
  EMPTY_TITLE: "DOCUMENT_EMPTY_TITLE",
} as const;

type DocumentErrorCode = typeof DocumentErrorCode[keyof typeof DocumentErrorCode];
```

## ポート

### DocumentSource

すべてのドキュメントを順次取得するインターフェース。データソース固有の取得・パース処理はアダプター実装に委譲する。

```typescript
interface DocumentSource {
  /**
   * すべてのドキュメントを順次取得するイテレータを返す
   * 取得・パース処理はアダプター実装に依存
   * @throws SystemError - ドキュメント取得に失敗した場合
   */
  iterate(): AsyncIterable<Document>;
}
```

**設計意図**:
- アプリケーション層がデータソースの詳細（API形式、ページネーション、パース方法）を知る必要がない
- 異なるデータソースを統一的なインターフェースで扱える
- AsyncIterableを使用することでメモリ効率が良い

**アダプター実装例**:
- `HttpSitemapDocumentSource`: sitemapをパース → 各URLからHTML取得 → CSSセレクタでパース
- `NotionDocumentSource`: Notion APIを呼び出し → Notion形式をパース
- `FileSystemDocumentSource`: ディレクトリを走査 → ファイルを読み込み・パース

#### リトライポリシー

DocumentSourceのアダプター実装は、以下のリトライポリシーに従う。

- **リトライ対象エラー**: ネットワークエラー、5xx系サーバーエラー、429 Too Many Requests
- **リトライ対象外**: 4xx系クライアントエラー（400, 401, 403, 404など）
- **アルゴリズム**: 指数バックオフ（Exponential Backoff）
- **設定**:
  - maxRetries: 最大リトライ回数（デフォルト: 3）
  - retryDelay: 初回遅延（デフォルト: 1000ms）

```typescript
// 遅延計算例（exponential backoff）
// attempt 0: 即座に実行
// attempt 1: 1000ms
// attempt 2: 2000ms
// attempt 3: 4000ms
delay = retryDelay * Math.pow(2, attempt)
```

#### レート制限

外部APIへの過剰なリクエストを防ぐため、レート制限を設定できる。

- **設定**:
  - requestDelay: リクエスト間の待機時間（デフォルト: 0ms）

```typescript
// 使用例
// 各ドキュメント取得後に100ms待機
const config = {
  requestDelay: 100
};
```

**推奨値**:
- 通常時: 0ms
- 大量処理時: 100-500ms

## 集約型

### SyncResult

同期処理の結果を表す。デバッグや詳細なエラーレポートのため、失敗したドキュメントIDも保持する。

```typescript
type SyncResult = Readonly<{
  totalCount: number;
  successCount: number;
  failedCount: number;
  failedIds: DocumentId[];
}>;

function createSyncResult(
  results: Array<{ id: DocumentId; success: boolean }>
): SyncResult {
  const failedIds = results.filter((r) => !r.success).map((r) => r.id);
  return {
    totalCount: results.length,
    successCount: results.length - failedIds.length,
    failedCount: failedIds.length,
    failedIds,
  };
}
```

### メッセージ生成関数

ユーザー通知用メッセージを生成する関数は、アダプター層（`src/core/adapters/line/messages/`）に配置する。これはUIテキストであり、ローカライゼーション（i18n）対応を考慮した設計となっている。

**配置**: `src/core/adapters/line/messages/ja.ts`

```typescript
/**
 * SyncResultからユーザー通知用メッセージを生成する
 */
function createSyncResultMessage(result: SyncResult): string {
  if (result.failedCount === 0) {
    // 全件成功
    return `同期が完了しました。${result.successCount}件のドキュメントを取得しました。`;
  } else if (result.successCount === 0) {
    // 全件失敗
    return `同期に失敗しました。全${result.totalCount}件のドキュメント取得に失敗しました。`;
  } else {
    // 部分的成功
    return `同期が部分的に完了しました。\n` +
           `成功: ${result.successCount}件\n` +
           `失敗: ${result.failedCount}件`;
  }
}

/**
 * インデックス構築結果からユーザー通知用メッセージを生成する
 */
function createBuildResultMessage(
  syncResult: SyncResult,
  buildResult: { totalEntries: number; buildDuration: number }
): string {
  const baseMessage = createSyncResultMessage(syncResult);
  const indexMessage = `インデックス構築完了: ${buildResult.totalEntries}件のエントリを作成（${Math.round(buildResult.buildDuration / 1000)}秒）`;
  return `${baseMessage}\n\n${indexMessage}`;
}
```

## アプリケーション層での利用

ポートの呼び出しはアプリケーション層が行う。Documentドメインのポートを使用した処理フローはSyncAndBuildIndexユースケース（`spec/usecases.md`参照）を参照。

**注意**: エンティティ・値オブジェクトのファクトリ関数（createDocument, createDocumentUrl等）がバリデーションを含むビジネスロジックを担当する。複数の集約にまたがる複雑なロジックが必要な場合のみドメインサービスを追加する。
