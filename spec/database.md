# データベース設計

## 概要

本システムはPostgreSQLを使用し、ベクトル検索にはpgvector拡張を利用する。

## テーブル一覧

| テーブル名 | ドメイン | 説明 |
|-----------|---------|------|
| documents | Document | パース済みドキュメントを保存 |
| vector_index_entries | VectorIndex | ベクトルインデックスエントリを保存 |
| answers | Answer | 生成された回答を保存（ログ・分析用） |
| answer_sources | Answer | 回答のソース情報を保存 |

## テーブル定義

### documents

パース済みドキュメントを保存するテーブル。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | VARCHAR(255) | NO | - | ドキュメントID（PK） |
| title | TEXT | NO | - | ドキュメントタイトル |
| content | TEXT | NO | - | ドキュメント本文 |
| metadata | JSONB | NO | '{}' | メタデータ（sourceUrl等） |
| fetched_at | TIMESTAMP WITH TIME ZONE | NO | - | 取得日時 |
| created_at | TIMESTAMP WITH TIME ZONE | NO | CURRENT_TIMESTAMP | レコード作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | NO | CURRENT_TIMESTAMP | レコード更新日時 |

**インデックス**:
- PRIMARY KEY (id)
- INDEX idx_documents_fetched_at (fetched_at)

**対応するエンティティ**: Document

```typescript
type Document = Readonly<{
  id: DocumentId;           // → id
  title: DocumentTitle;     // → title
  content: DocumentContent; // → content
  metadata: DocumentMetadata; // → metadata
  fetchedAt: Date;          // → fetched_at
}>;
```

### vector_index_entries

ベクトルインデックスエントリを保存するテーブル。pgvectorを使用してベクトル検索を実現する。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | VARCHAR(255) | NO | - | エントリID（PK） |
| document_id | VARCHAR(255) | NO | - | 参照元ドキュメントID（FK） |
| document_title | TEXT | NO | - | ドキュメントタイトル（キャッシュ） |
| content | TEXT | NO | - | チャンク化されたテキスト |
| embedding | VECTOR(1536) | NO | - | ベクトル埋め込み |
| chunk_index | INTEGER | NO | - | ドキュメント内でのチャンク順序（0-indexed） |
| created_at | TIMESTAMP WITH TIME ZONE | NO | CURRENT_TIMESTAMP | レコード作成日時 |

**インデックス**:
- PRIMARY KEY (id)
- INDEX idx_vector_index_entries_document_id (document_id)
- INDEX idx_vector_index_entries_embedding USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10)
- UNIQUE (document_id, chunk_index)

**外部キー制約**:
- document_id → documents(id) ON DELETE CASCADE

**対応するエンティティ**: VectorIndexEntry

```typescript
type VectorIndexEntry = Readonly<{
  id: VectorIndexEntryId;   // → id
  documentId: DocumentId;   // → document_id
  documentTitle: string;    // → document_title
  content: string;          // → content
  embedding: Embedding;     // → embedding
  chunkIndex: number;       // → chunk_index
  createdAt: Date;          // → created_at
}>;
```

**備考**:
- `document_title`は検索パフォーマンス向上のためのキャッシュ
- インデックス構築時に全エントリを再構築するため、タイトルの不整合は発生しない
- VECTOR(1536)はOpenAI text-embedding-ada-002の次元数。使用するモデルに応じて調整が必要
- **重要**: VECTOR次元数は設定の`embedding.dimensions`と一致させること
- IVFFlat インデックスはデータ量に応じてlistsパラメータを調整する
- **(document_id, chunk_index)のユニーク制約**: 現在は全再構築方式を採用しているが、将来の差分更新方式への移行に備えてユニーク制約を設定。全再構築時はclear()後にadd()するため、制約違反は発生しない

### answers

生成された回答を保存するテーブル（ログ・分析用）。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | VARCHAR(255) | NO | - | 回答ID（PK） |
| question | TEXT | NO | - | ユーザーからの質問 |
| content | TEXT | NO | - | 生成された回答本文 |
| generated_at | TIMESTAMP WITH TIME ZONE | NO | - | 回答生成日時 |
| created_at | TIMESTAMP WITH TIME ZONE | NO | CURRENT_TIMESTAMP | レコード作成日時 |

**インデックス**:
- PRIMARY KEY (id)
- INDEX idx_answers_generated_at (generated_at)

**対応するエンティティ**: Answer

```typescript
type Answer = Readonly<{
  id: AnswerId;             // → id
  question: Question;       // → question
  content: AnswerContent;   // → content
  sources: AnswerSource[];  // → answer_sources テーブル
  generatedAt: Date;        // → generated_at
}>;
```

### answer_sources

回答のソース情報を保存するテーブル。

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | VARCHAR(255) | NO | - | ソースID（PK） |
| answer_id | VARCHAR(255) | NO | - | 参照元回答ID（FK） |
| document_id | VARCHAR(255) | NO | - | 参照元ドキュメントID |
| document_title | TEXT | NO | - | ドキュメントタイトル |
| relevant_content | TEXT | NO | - | 関連コンテンツ |
| score | DOUBLE PRECISION | NO | - | 類似度スコア |
| created_at | TIMESTAMP WITH TIME ZONE | NO | CURRENT_TIMESTAMP | レコード作成日時 |

**インデックス**:
- PRIMARY KEY (id)
- INDEX idx_answer_sources_answer_id (answer_id)
- INDEX idx_answer_sources_document_id (document_id)

**外部キー制約**:
- answer_id → answers(id) ON DELETE CASCADE

**対応するエンティティ**: AnswerSource

```typescript
type AnswerSource = Readonly<{
  id: AnswerSourceId;         // → id
  documentId: DocumentId;     // → document_id
  documentTitle: string;      // → document_title
  relevantContent: string;    // → relevant_content
  score: SimilarityScore;     // → score
}>;
```

## ER図

```
┌─────────────────────┐
│     documents       │
├─────────────────────┤
│ PK id               │
│    title            │
│    content          │
│    metadata         │
│    fetched_at       │
│    created_at       │
│    updated_at       │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│  vector_index_entries   │
├─────────────────────────┤
│ PK id                   │
│ FK document_id          │
│    document_title       │
│    content              │
│    embedding            │
│    chunk_index          │
│    created_at           │
└─────────────────────────┘


┌─────────────────────┐
│      answers        │
├─────────────────────┤
│ PK id               │
│    question         │
│    content          │
│    generated_at     │
│    created_at       │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│    answer_sources       │
├─────────────────────────┤
│ PK id                   │
│ FK answer_id            │
│    document_id          │
│    document_title       │
│    relevant_content     │
│    score                │
│    created_at           │
└─────────────────────────┘
```

## マイグレーション

### 初期セットアップ

```sql
-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- updated_at自動更新用のトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- documentsテーブル
CREATE TABLE documents (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_fetched_at ON documents(fetched_at);

-- documents.updated_at自動更新トリガー
-- 将来の差分更新方式に備えて定義
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- vector_index_entriesテーブル
CREATE TABLE vector_index_entries (
  id VARCHAR(255) PRIMARY KEY,
  document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vector_index_entries_document_id ON vector_index_entries(document_id);
CREATE INDEX idx_vector_index_entries_embedding ON vector_index_entries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE UNIQUE INDEX idx_vector_index_entries_document_chunk ON vector_index_entries(document_id, chunk_index);

-- 備考: lists = 10 は初期状態（1,000件未満）に最適化。
-- データ量増加時はベストプラクティスに従いlistsパラメータを調整すること。

-- answersテーブル
CREATE TABLE answers (
  id VARCHAR(255) PRIMARY KEY,
  question TEXT NOT NULL,
  content TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_answers_generated_at ON answers(generated_at);

-- answer_sourcesテーブル
CREATE TABLE answer_sources (
  id VARCHAR(255) PRIMARY KEY,
  answer_id VARCHAR(255) NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  document_id VARCHAR(255) NOT NULL,
  document_title TEXT NOT NULL,
  relevant_content TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_answer_sources_answer_id ON answer_sources(answer_id);
CREATE INDEX idx_answer_sources_document_id ON answer_sources(document_id);
```

## 設計上の考慮事項

### ベクトル検索の最適化

1. **インデックス戦略**: IVFFlat インデックスを使用し、lists パラメータはデータ量に応じて調整
   - 1,000件未満: lists = 10
   - 1,000〜10,000件: lists = 100
   - 10,000件以上: lists = sqrt(N) を目安

   **IVFFlatインデックスの運用手順**:

   データ量に応じたlistsパラメータの更新:
   ```sql
   -- 1. 現在のエントリ数を確認
   SELECT COUNT(*) FROM vector_index_entries;

   -- 2. 既存のインデックスを削除
   DROP INDEX IF EXISTS idx_vector_index_entries_embedding;

   -- 3. 新しいlistsパラメータでインデックスを再作成
   -- エントリ数に応じてlistsを調整（例: 50,000件の場合 lists = 224 ≈ sqrt(50000)）
   CREATE INDEX idx_vector_index_entries_embedding ON vector_index_entries
     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 224);

   -- 4. 統計情報を更新
   VACUUM ANALYZE vector_index_entries;
   ```

   **調整のタイミング**:
   - ドキュメント数が閾値を超えた場合（例: 1,000件、10,000件）
   - 検索パフォーマンスが低下した場合
   - 大量データ投入後

   **VACUUM ANALYZEの実行タイミング**:
   - インデックス構築直後
   - 大量データ投入後
   - 定期メンテナンス時（週次推奨）

2. **次元数**: VECTOR(1536)はOpenAI text-embedding-ada-002の次元数
   - 他のモデルを使用する場合は適宜変更
   - 設定の`embedding.dimensions`と必ず一致させる
   - **整合性チェック仕様**:
     - アプリケーション起動時にDBスキーマの次元数と設定値を比較
     - 不一致時はエラーを投げて起動を中断
     - マイグレーション実行時にも同様のチェックを実施
   - **実装レイヤー**: アダプター層（インフラストラクチャ層）
     - `src/core/adapters/postgres/vectorStoreAdapter.ts`などのアダプター初期化時に実装
     - アダプターのコンストラクタまたは初期化メソッドで検証を実行
     - 責務: 外部システム（DB）との接続・整合性はアダプター層が担当

   ```typescript
   // アダプター初期化時のチェック例
   class PostgresVectorStoreAdapter implements VectorStorePort {
     constructor(private db: DatabaseConnection, private config: EmbeddingConfig) {}

     async initialize(): Promise<void> {
       await this.validateVectorDimensions();
     }

     private async validateVectorDimensions(): Promise<void> {
       const result = await this.db.query(`
         SELECT atttypmod
         FROM pg_attribute
         WHERE attrelid = 'vector_index_entries'::regclass
         AND attname = 'embedding'
       `);
       const dbDimensions = result.rows[0]?.atttypmod;

       if (dbDimensions !== this.config.dimensions) {
         throw new SystemError(
           "CONFIG_VECTOR_DIMENSION_MISMATCH",
           `Vector dimensions mismatch: DB=${dbDimensions}, Config=${this.config.dimensions}. ` +
           `Run migration to update schema or adjust EmbeddingConfig.dimensions.`
         );
       }
     }
   }
   ```

   **次元数変更時のマイグレーション手順**:
   1. 新しい次元数でスキーマを更新（ALTER TABLE）
   2. 既存のベクトルデータを全削除（clear）
   3. 全ドキュメントを再取得してインデックスを再構築

3. **類似度計算**: コサイン類似度（vector_cosine_ops）を使用

### データの整合性

1. **カスケード削除**:
   - ドキュメント削除時にベクトルエントリも削除
   - 回答削除時にソース情報も削除

2. **answer_sourcesのdocument_id**:
   - 外部キー制約を設定していない
   - **理由**: 回答履歴は分析・監査目的で長期保持するため、参照元ドキュメントが削除されても回答履歴は保持する必要がある
   - **許容される状況**: ドキュメント再同期時に古いドキュメントが削除されても、過去の回答履歴でどのドキュメントを参照したかの記録は残す
   - **整合性の担保**: 分析時は存在しないdocument_idが含まれる可能性を考慮し、LEFT JOINを使用する

### 非正規化フィールドの更新責務

以下のフィールドはパフォーマンス向上のために非正規化されている。

#### vector_index_entries.document_title

**更新責務**: VectorIndexドメインのBuildVectorIndex

**更新タイミング**:
- インデックス全再構築時に自動更新される
- 個別更新は不要（現在の設計では差分更新を行わない）

**将来の差分更新対応**:
- UpdateVectorIndexでは、documentsテーブルから最新のtitleを取得して更新すること
- または、削除→再追加のパターンで更新する

#### answer_sources.document_title

**更新責務**: 更新しない（履歴保持）

**理由**:
- answersテーブルは履歴・分析目的で保持される
- 回答生成時点のドキュメントタイトルを保持することで、当時の状況を正確に記録
- ドキュメントタイトルが後から変更されても、過去の回答は変更しない

**仕様**: 回答生成時点のスナップショットとして保持。更新は行わない。

### パフォーマンス考慮

1. **バッチ処理**: ドキュメント同期時は一括INSERTを使用
2. **インデックス再構築**: 大量データ投入後はVACUUM ANALYZEを実行
3. **接続プール**: Drizzle ORMのプール設定を適切に構成

### 将来の拡張

1. **全文検索**: 必要に応じてtsvector/tsqueryを追加
2. **パーティショニング**: データ量増加時にanswersテーブルを日付でパーティション化
3. **アーカイブ**: 古いanswersデータの定期的なアーカイブ処理
