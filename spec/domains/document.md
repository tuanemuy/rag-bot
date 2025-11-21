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

### DocumentListItem

ドキュメント一覧の各アイテムを表す。

```typescript
type DocumentListItem = Readonly<{
  id: DocumentId;
  url: DocumentUrl;
}>;
```

### RawDocument

APIから取得した生のドキュメントを表す。

```typescript
type RawDocument = Readonly<{
  id: DocumentId;
  format: DocumentFormat;
  data: string;
}>;
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

### DocumentFormat

ドキュメントの形式。

```typescript
type DocumentFormat = "json" | "html" | "text";
```

### DocumentMetadata

ドキュメントのメタデータ。

```typescript
type DocumentMetadata = Readonly<{
  sourceUrl: DocumentUrl;
  format: DocumentFormat;
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
  format: DocumentFormat;
  additionalData: Readonly<Record<string, JsonValue>>;
}>;
```

### PaginationType

ページネーションの種類。

```typescript
type PaginationType = "offset" | "cursor";
```

### OffsetPagination

オフセットベースのページネーション情報。

```typescript
type OffsetPagination = Readonly<{
  type: "offset";
  offset: number;
  limit: number;
  total: number;
}>;
```

### CursorPagination

カーソルベースのページネーション情報。

```typescript
type CursorPagination = Readonly<{
  type: "cursor";
  cursor: string | null;
  hasNext: boolean;
}>;
```

### ParserConfig

パーサーの設定。各ドキュメント形式のパースに必要な設定を定義する。

```typescript
/**
 * JSONドキュメントのパース設定
 */
type JsonParserConfig = Readonly<{
  format: "json";
  titlePath: string;        // タイトルを取得するJSONパス
  contentPath: string;      // コンテンツを取得するJSONパス
  metadataPath?: string;    // メタデータを取得するJSONパス（オプショナル）
}>;

/**
 * HTMLドキュメントのパース設定
 */
type HtmlParserConfig = Readonly<{
  format: "html";
  titleSelector: string;    // タイトルを取得するCSSセレクタ
  contentSelector: string;  // コンテンツを取得するCSSセレクタ
}>;

/**
 * プレーンテキストドキュメントのパース設定
 */
type TextParserConfig = Readonly<{
  format: "text";
  titleLineCount?: number;  // タイトルとして使用する行数（デフォルト: 1）
}>;

/**
 * パーサー設定の判別共用体
 */
type ParserConfig = JsonParserConfig | HtmlParserConfig | TextParserConfig;
```

**設計意図**:
- ドメイン層で独立した値オブジェクトとして定義し、外部モジュールへの依存を避ける
- 判別共用体を使用して各形式の設定を型安全に扱う
- DIコンテナ生成時に環境変数から読み込んだ設定値をもとにParserConfigを生成し、DocumentParserアダプターに注入する

## エラーコード

Documentドメインで使用するエラーコード。

```typescript
const DocumentErrorCode = {
  // 取得エラー
  FETCH_FAILED: "DOCUMENT_FETCH_FAILED",
  LIST_FETCH_FAILED: "DOCUMENT_LIST_FETCH_FAILED",
  CONTENT_FETCH_FAILED: "DOCUMENT_CONTENT_FETCH_FAILED",

  // パースエラー
  PARSE_FAILED: "DOCUMENT_PARSE_FAILED",
  INVALID_JSON_FORMAT: "DOCUMENT_INVALID_JSON_FORMAT",
  INVALID_HTML_FORMAT: "DOCUMENT_INVALID_HTML_FORMAT",
  FIELD_NOT_FOUND: "DOCUMENT_FIELD_NOT_FOUND",
  SELECTOR_NOT_FOUND: "DOCUMENT_SELECTOR_NOT_FOUND",

  // 永続化エラー
  SAVE_FAILED: "DOCUMENT_SAVE_FAILED",

  // バリデーションエラー
  INVALID_URL: "DOCUMENT_INVALID_URL",
  EMPTY_CONTENT: "DOCUMENT_EMPTY_CONTENT",
} as const;

type DocumentErrorCode = typeof DocumentErrorCode[keyof typeof DocumentErrorCode];
```

## ポート

### DocumentListFetcher

ドキュメント一覧を取得するインターフェース。

```typescript
interface DocumentListFetcher {
  /**
   * ドキュメント一覧を取得する（オフセットベース）
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @throws SystemError - 最大リトライ回数を超えてもAPI呼び出しに失敗した場合
   */
  fetchWithOffset(offset: number, limit: number): Promise<{
    items: DocumentListItem[];
    pagination: OffsetPagination;
  }>;

  /**
   * ドキュメント一覧を取得する（カーソルベース）
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @throws SystemError - 最大リトライ回数を超えてもAPI呼び出しに失敗した場合
   */
  fetchWithCursor(cursor: string | null): Promise<{
    items: DocumentListItem[];
    pagination: CursorPagination;
  }>;
}
```

### DocumentContentFetcher

ドキュメント内容を取得するインターフェース。

```typescript
interface DocumentContentFetcher {
  /**
   * ドキュメント内容を取得する
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @param item - ドキュメントリストアイテム（id と url を含む）
   * @throws SystemError - 最大リトライ回数を超えてもAPI呼び出しに失敗した場合
   */
  fetch(item: DocumentListItem): Promise<RawDocument>;
}
```

**設計意図**:
- 引数を`DocumentListItem`とすることで、idとurlを両方渡せる
- フェッチャーが完全な`RawDocument`（idを含む）を生成できる
- 呼び出し元でidを付与する必要がなくなり、シンプルな設計になる

#### リトライポリシー

DocumentListFetcherおよびDocumentContentFetcherのアダプター実装は、以下のリトライポリシーに従う。

- **リトライ対象エラー**: ネットワークエラー、5xx系サーバーエラー、429 Too Many Requests
- **リトライ対象外**: 4xx系クライアントエラー（400, 401, 403, 404など）
- **アルゴリズム**: 指数バックオフ（Exponential Backoff）
- **設定**: 設定の`documentApi.retry`を参照
  - maxRetries: 最大リトライ回数（デフォルト: 3）
  - initialDelayMs: 初回遅延（デフォルト: 1000ms）
  - maxDelayMs: 最大遅延（デフォルト: 10000ms）
  - backoffMultiplier: 乗数（デフォルト: 2）

```typescript
// 遅延計算例
// attempt 1: 1000ms
// attempt 2: 2000ms
// attempt 3: 4000ms (maxDelayMsで上限)
delay = min(initialDelayMs * (backoffMultiplier ^ (attempt - 1)), maxDelayMs)
```

### DocumentParser

ドキュメントをパースするインターフェース。

```typescript
interface DocumentParser {
  /**
   * 生のドキュメントをパースして構造化する
   * @throws ValidationError - パースに失敗した場合
   */
  parse(rawDocument: RawDocument, config: ParserConfig): Document;
}
```

### DocumentRepository

ドキュメントを永続化するインターフェース。

```typescript
interface DocumentRepository {
  /**
   * ドキュメントを保存する
   * @throws SystemError - 保存に失敗した場合
   */
  save(document: Document): Promise<void>;

  /**
   * ドキュメントを一括保存する
   * トランザクション内での使用を前提とし、全件成功/全件失敗のセマンティクスを持つ
   * @throws SystemError - 保存に失敗した場合（1件でも失敗した場合は全体をロールバック）
   */
  saveMany(documents: Document[]): Promise<void>;

  /**
   * すべてのドキュメントを取得する
   */
  findAll(): Promise<Document[]>;

  /**
   * IDでドキュメントを取得する
   */
  findById(id: DocumentId): Promise<Document | null>;

  /**
   * ドキュメント数を取得する
   */
  count(): Promise<number>;

  /**
   * すべてのドキュメントを削除する
   */
  deleteAll(): Promise<void>;
}
```

## 集約型

### SyncResult

同期処理の結果を表す。

```typescript
type SyncResult = Readonly<{
  totalCount: number;
  successCount: number;
  failedCount: number;
  failedIds: DocumentId[];
}>;

function createSyncResult(results: Array<{ id: DocumentId; success: boolean }>): SyncResult {
  const failedIds = results.filter(r => !r.success).map(r => r.id);
  return {
    totalCount: results.length,
    successCount: results.length - failedIds.length,
    failedCount: failedIds.length,
    failedIds,
  };
}

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
           `失敗: ${result.failedCount}件\n` +
           `失敗したドキュメントID: ${result.failedIds.slice(0, 5).join(", ")}` +
           (result.failedIds.length > 5 ? ` 他${result.failedIds.length - 5}件` : "");
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

ポートの呼び出しはアプリケーション層が行う。Documentドメインのポートを使用した処理フローはSyncAndBuildIndexユースケース（`spec/domains/index.md`参照）を参照。

**注意**: エンティティ・値オブジェクトのファクトリ関数（createDocument, createDocumentUrl等）がバリデーションを含むビジネスロジックを担当する。複数の集約にまたがる複雑なロジックが必要な場合のみドメインサービスを追加する。
