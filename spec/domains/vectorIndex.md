# VectorIndex ドメイン

ベクトルインデックスの管理に関するドメイン。ドキュメントのインデックス構築、更新、検索を担当する。

## エンティティ

### VectorIndexEntry

インデックスに登録されたエントリを表す。

```typescript
type VectorIndexEntry = Readonly<{
  id: VectorIndexEntryId;
  documentId: DocumentId;
  documentTitle: string;
  content: string;
  embedding: Embedding;
  chunkIndex: number;  // ドキュメント内でのチャンク順序（0-indexed）
  createdAt: Date;
}>;

function createVectorIndexEntry(params: {
  id: VectorIndexEntryId;
  documentId: DocumentId;
  documentTitle: string;
  content: string;
  embedding: Embedding;
  chunkIndex: number;
  createdAt: Date;
}): VectorIndexEntry {
  if (params.embedding.length === 0) {
    throw new BusinessRuleError("VECTOR_INDEX_INVALID_EMBEDDING", "Embedding cannot be empty");
  }
  if (params.chunkIndex < 0) {
    throw new BusinessRuleError("VECTOR_INDEX_INVALID_CHUNK_INDEX", "Chunk index must be non-negative");
  }
  return params;
}
```

**設計意図**:
- `documentTitle`をキャッシュとして保持することで、検索時にDocumentRepositoryを参照する必要がなくなる
- インデックス構築時に全エントリを再構築するため、タイトルの不整合は発生しない
- 検索パフォーマンスの向上に寄与する

### SearchResult

検索結果を表す。

```typescript
type SearchResult = Readonly<{
  entry: VectorIndexEntry;
  score: SimilarityScore;
}>;
```

### VectorIndexStatus

インデックスの状態を表す。

```typescript
type VectorIndexStatus = Readonly<{
  exists: boolean;
  entryCount: number;
  lastUpdatedAt: Date | null;
}>;

function isIndexAvailable(status: VectorIndexStatus): boolean {
  // インデックスが存在し、エントリが1件以上ある場合のみ利用可能
  return status.exists && status.entryCount > 0;
}
```

## 値オブジェクト

### VectorIndexEntryId

インデックスエントリの一意識別子。

```typescript
type VectorIndexEntryId = string & { readonly brand: "VectorIndexEntryId" };
```

### DocumentId

ドキュメントの一意識別子。共通型定義（`shared`）を参照する。

```typescript
// src/core/domain/shared/documentId.ts から参照
type DocumentId = string & { readonly brand: "DocumentId" };
```

### Embedding

ベクトル埋め込み。

```typescript
type Embedding = number[] & { readonly brand: "Embedding" };
```

### SimilarityScore

類似度スコア（0-1の範囲）。共通型定義（`shared`）を参照する。

```typescript
// src/core/domain/shared/similarityScore.ts から参照
type SimilarityScore = number & { readonly brand: "SimilarityScore" };
```

### TopK

取得する上位件数。

```typescript
type TopK = number & { readonly brand: "TopK" };

function createTopK(value: number): TopK {
  if (!Number.isInteger(value) || value <= 0) {
    throw new BusinessRuleError("VECTOR_INDEX_INVALID_TOP_K", "TopK must be a positive integer");
  }
  return value as TopK;
}
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

  // ステータスエラー
  INDEX_NOT_FOUND: "VECTOR_INDEX_NOT_FOUND",
  INDEX_EMPTY: "VECTOR_INDEX_EMPTY",

  // バリデーションエラー
  INVALID_TOP_K: "VECTOR_INDEX_INVALID_TOP_K",
  INVALID_EMBEDDING: "VECTOR_INDEX_INVALID_EMBEDDING",
  INVALID_CHUNK_INDEX: "VECTOR_INDEX_INVALID_CHUNK_INDEX",
} as const;

type VectorIndexErrorCode = typeof VectorIndexErrorCode[keyof typeof VectorIndexErrorCode];
```

**エラーコードの使用場面**:

- `INDEX_NOT_FOUND`: `SearchVectorIndex`など、インデックスが必須の操作で使用
- `INDEX_EMPTY`: インデックスにエントリが0件の場合に使用

**注意**: `CheckVectorIndexExists`はbooleanを返すユースケースであり、これらのエラーは投げない。インデックスの存在確認は正常系として処理される。

## 埋め込みモデル変更時の移行戦略

**重要**: 設定の`embedding.model`を変更した場合、既存のベクトルとの互換性がなくなるため、以下の手順でインデックスを再構築する必要がある。

### 移行手順

1. **事前準備**
   - 新しいモデルのベクトル次元数を確認（`embedding.dimensions`）
   - 現在のDBスキーマの次元数と異なる場合は、データベースマイグレーションも必要

2. **設定変更**
   - `embedding.model`を新しいモデル名に変更
   - `embedding.dimensions`を新しい次元数に変更（必要な場合）

3. **データベースマイグレーション**（次元数が異なる場合）
   ```sql
   -- 既存のインデックスを削除
   DROP INDEX IF EXISTS idx_vector_index_entries_embedding;

   -- カラムの次元数を変更
   ALTER TABLE vector_index_entries
     ALTER COLUMN embedding TYPE VECTOR(新しい次元数);

   -- インデックスを再作成
   CREATE INDEX idx_vector_index_entries_embedding ON vector_index_entries
     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

4. **インデックス再構築**
   - `sync`コマンドを実行して全ドキュメントのインデックスを再構築
   - 既存のベクトルエントリは全て削除され、新しいモデルで再生成される

### 注意事項

- **ダウンタイム**: 移行中はインデックスが利用不可となるため、計画的に実施すること
- **コスト**: 全ドキュメントの再埋め込み生成が必要なため、Embedding API使用量が発生
- **検証**: 移行後は検索品質をテストし、期待通りの結果が得られることを確認

### 将来の拡張

モデルバージョンをメタデータとして保持することで、異なるモデルで生成されたベクトルを識別し、段階的な移行を可能にする拡張も検討可能。ただし、現時点では単一モデルでの運用を前提とする。

### ダウンタイム最小化戦略（将来の検討事項）

本番環境でのダウンタイムを最小化するための戦略として、以下を検討可能:

**1. Blue-Greenデプロイメント**
- 新しいモデル用の別インデックス（Green）を事前に構築
- 構築完了後、トラフィックをGreenに切り替え
- 問題があれば旧インデックス（Blue）に即座にフォールバック可能

**2. 段階的移行（新旧モデルの並行運用）**
- モデルバージョンをエントリのメタデータとして保持
- 新規ドキュメントは新モデルで埋め込み生成
- 検索時は両モデルの結果をマージ
- 全ドキュメントの移行完了後、旧モデルのエントリを削除

**優先度**: 低（初期実装では計画的なメンテナンスウィンドウでの移行を前提とする）

## ポート

### EmbeddingGenerator

テキストからベクトル埋め込みを生成するインターフェース。

```typescript
interface EmbeddingGenerator {
  /**
   * テキストからベクトル埋め込みを生成する
   * @param text - 埋め込み対象のテキスト（ドキュメントチャンクまたは検索クエリ）
   * @throws SystemError - 埋め込み生成に失敗した場合
   */
  generate(text: string): Promise<Embedding>;

  /**
   * 複数テキストからベクトル埋め込みを一括生成する
   * @throws SystemError - 埋め込み生成に失敗した場合
   */
  generateBatch(texts: string[]): Promise<Embedding[]>;
}
```

**設計意図**:
- `generate`の引数は`string`型とし、Branded Typeは使用しない
- これにより、AnswerドメインのQuestion型からの変換が不要になる
- アプリケーション層での使用例:

```typescript
// 検索時（Questionを文字列として渡す）
const embedding = await context.embeddingGenerator.generate(question as string);

// インデックス構築時（チャンクを直接渡す）
const embeddings = await context.embeddingGenerator.generateBatch(chunks);
```

**バッチサイズ制限**:

外部APIには入力数やトークン数の上限があるため、以下の方針でバッチ処理を行う。

- **責務**: アダプター層が自動的にバッチを分割
- **デフォルト設定**: 1回のAPIリクエストあたり最大100件（OpenAI APIの推奨値）
- **分割アルゴリズム**:
  1. 入力配列をバッチサイズで分割
  2. 各バッチを順次APIに送信
  3. 結果を結合して返却
- **エラーハンドリング**:
  - generateBatch自体はバッチ途中でエラーが発生した場合、全体を失敗として扱う
  - ただし、アプリケーション層（SyncAndBuildIndex）でドキュメント単位のリカバリーを実装
  - 1ドキュメントの埋め込み生成失敗時は、そのドキュメントをスキップして他のドキュメントは処理を継続
  - スキップされたドキュメント情報はSyncResultに記録される

```typescript
// アダプター実装例
class OpenAIEmbeddingGenerator implements EmbeddingGenerator {
  private readonly batchSize = 100;  // OpenAI推奨値

  async generateBatch(texts: string[]): Promise<Embedding[]> {
    const results: Embedding[] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const embeddings = await this.callOpenAIAPI(batch);
      results.push(...embeddings);
    }
    return results;
  }
}
```

### VectorStore

ベクトルインデックスを管理するインターフェース。

```typescript
interface VectorStore {
  /**
   * インデックスにエントリを追加する
   * @throws SystemError - 追加に失敗した場合
   */
  add(entries: VectorIndexEntry[]): Promise<void>;

  /**
   * 類似検索を実行する
   * インデックスが空の場合は空配列を返す
   * @throws SystemError - DB操作に失敗した場合
   */
  search(embedding: Embedding, topK: TopK): Promise<SearchResult[]>;

  /**
   * 指定したドキュメントIDに関連するエントリを削除する
   *
   * **設計意図**: 将来の差分更新方式への移行に備えて定義。
   * 現在は全再構築方式（clear() + add()）を採用しているため使用されないが、
   * 差分更新方式では、変更されたドキュメントのみを削除・再追加することで
   * パフォーマンスを向上させることができる。
   *
   * 冪等性を保つため、存在しないdocumentIdを指定した場合は何もせず成功とする
   * （ログには記録する）
   *
   * @throws SystemError - DB操作に失敗した場合
   */
  deleteByDocumentId(documentId: DocumentId): Promise<void>;

  /**
   * インデックスをクリアする
   * @throws SystemError - クリアに失敗した場合
   */
  clear(): Promise<void>;

  /**
   * インデックスの状態を取得する
   *
   * **実装仕様**:
   * - `entryCount`: vector_index_entriesテーブルの総件数
   * - `lastUpdatedAt`: vector_index_entriesテーブルのcreated_atの最大値（MAX）
   * - `exists`: entryCount > 0 の場合true
   *
   * エントリが0件の場合、lastUpdatedAtはnullを返す
   */
  getStatus(): Promise<VectorIndexStatus>;
}
```

### TextSplitter

テキストをチャンクに分割するインターフェース。

```typescript
type TextSplitterConfig = Readonly<{
  chunkSize: number;      // チャンクの最大文字数
  chunkOverlap: number;   // チャンク間のオーバーラップ文字数
}>;

interface TextSplitter {
  /**
   * テキストをチャンクに分割する
   * @param text - 分割対象のテキスト
   * @param config - 分割設定
   * @returns 分割されたチャンクの配列
   */
  split(text: string, config: TextSplitterConfig): string[];
}
```

**設計意図**:
- 設定をsplit()メソッドの引数として渡すことで、呼び出し時に柔軟に調整可能
- 設定からTextSplitterConfigを取得し、アプリケーション層で渡す
- チャンクサイズやオーバーラップはドキュメントの特性に応じて調整できる

**設定からの変換**:

TextSplitterConfigは設定のvectorIndexから直接マッピングできる:

```typescript
// アプリケーション層での使用例
import { config } from "../../config";

function getTextSplitterConfig(): TextSplitterConfig {
  return {
    chunkSize: config.vectorIndex.chunkSize,
    chunkOverlap: config.vectorIndex.chunkOverlap,
  };
}

// ユースケース内での使用
const splitterConfig = getTextSplitterConfig();
const chunks = context.textSplitter.split(document.content, splitterConfig);
```

## 集約型

### VectorIndexBuildResult

インデックス構築の結果を表す。

```typescript
type VectorIndexBuildResult = Readonly<{
  totalDocuments: number;
  totalEntries: number;
  buildDuration: number; // ミリ秒
}>;

function createBuildResult(
  totalDocuments: number,
  totalEntries: number,
  startTime: Date
): VectorIndexBuildResult {
  return {
    totalDocuments,
    totalEntries,
    buildDuration: Date.now() - startTime.getTime(),
  };
}
```

## アプリケーション層での利用

ポートの呼び出しはアプリケーション層が行う。VectorIndexドメインのポートを使用した処理フローはSyncAndBuildIndex、GenerateAndReplyAnswerユースケース（`spec/domains/index.md`参照）を参照。

**注意**: エンティティ・値オブジェクトのファクトリ関数（createVectorIndexEntry, createTopK, isIndexAvailable等）がバリデーションを含むビジネスロジックを担当する。複数の集約にまたがる複雑なロジックが必要な場合のみドメインサービスを追加する。

**差分更新時の注意**: UpdateVectorIndex実装時はdocument_titleの不整合に注意が必要。documentsテーブルから最新のtitleを取得する処理を実装すること。
