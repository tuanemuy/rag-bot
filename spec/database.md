# データベース設計

## 概要

本システムはPostgreSQLを使用し、ベクトル検索にはpgvector拡張を利用する。

## テーブル一覧

| テーブル名 | 管理主体 | 説明 |
|-----------|---------|------|
| documents | Document | パース済みドキュメントを保存 |
| vector_index_entries | IndexBuilder（LlamaIndex経由） | ベクトルインデックスエントリを保存 |

**注記**: vector_index_entriesテーブルはLlamaIndex等のRAGフレームワークによって管理される。テーブルスキーマはフレームワークの内部実装に依存するため、Drizzleマイグレーションには含めない。VectorIndexEntry等の関連型はドメイン層で定義する。

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

### vector_index_entries（LlamaIndex管理）

ベクトルインデックスエントリを保存するテーブル。pgvectorを使用してベクトル検索を実現する。

**重要**: このテーブルはLlamaIndexのPGVectorStoreによって完全に管理される。テーブルの作成・スキーマの管理はLlamaIndexに委任し、Drizzleマイグレーションには含めない。

**LlamaIndex PGVectorStoreの設定**:

```typescript
const vectorStore = new PGVectorStore({
  clientConfig: { connectionString: databaseUrl },
  schemaName: "public",
  tableName: "llamaindex_vectors", // LlamaIndexが管理するテーブル名
});
```

**設計上の考慮事項**:

- LlamaIndexは内部でテーブルを自動作成し、独自のスキーマで管理する
- 外部キー制約（document_id → documents(id)）は設定しない
  - 理由: LlamaIndexの内部実装と競合する可能性があるため
- ドキュメント削除時のインデックスクリーンアップは、IndexBuilder.buildIndex()の全再構築時に実施
- メタデータ（documentId, title等）はLlamaIndexのノードメタデータとして保存

**参考: 想定されるスキーマ構造**:

LlamaIndex PGVectorStoreは以下のようなスキーマを自動生成する（実際の構造はLlamaIndexのバージョンに依存）：

- id: ノードの一意識別子
- embedding: ベクトル埋め込み
- text: チャンク化されたテキスト
- metadata: JSON形式のメタデータ（documentId, title等を含む）

**備考**:
- 埋め込みモデルにはtext-embedding-3-small（1536次元）を使用
- LlamaIndexの設定でchunkSizeとchunkOverlapを調整可能

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
└─────────────────────┘

※ vector_index_entriesはLlamaIndexが管理するため、
  ER図からは除外（外部キー制約なし）
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

-- 注記: vector_index_entriesテーブルはLlamaIndex PGVectorStoreによって自動作成される
-- Drizzleマイグレーションには含めない
```

## 設計上の考慮事項

### ベクトル検索の最適化

1. **インデックス戦略**: HNSWインデックスを使用（LlamaIndexによって自動作成）
   - HNSWはIVFFlatと比較してビルド時間は長いが、クエリパフォーマンスが優れている
   - パラメータ調整が不要で、データ量に応じた手動チューニングが不要
   - LlamaIndexが内部でインデックスを管理するため、直接の操作は推奨しない

   **パフォーマンスが低下した場合**:
   - LlamaIndexの設定を調整（chunkSize, chunkOverlap等）
   - HNSWパラメータの調整が必要な場合は、LlamaIndexの設定を通じて行う

   **VACUUM ANALYZEの実行タイミング**:
   - 大量データ投入後
   - 定期メンテナンス時（週次推奨）

2. **埋め込みモデルと次元数**: text-embedding-3-small（1536次元）を使用
   - LlamaIndexがテーブルを自動作成するため、次元数はLlamaIndexの設定で管理
   - 設定の`embeddingModel`パラメータで使用するモデルを指定

3. **類似度計算**: コサイン類似度を使用（LlamaIndex PGVectorStoreのデフォルト）

### データの整合性

1. **カスケード削除**:
   - ドキュメント削除時にベクトルエントリも削除（IndexBuilder.buildIndex()の全再構築時）

### パフォーマンス考慮

1. **バッチ処理**: ドキュメント同期時は一括INSERTを使用
2. **インデックス再構築**: 大量データ投入後はVACUUM ANALYZEを実行
3. **接続プール**: Drizzle ORMのプール設定を適切に構成

### 将来の拡張

1. **全文検索**: 必要に応じてtsvector/tsqueryを追加
2. **回答履歴**: 必要に応じてanswersテーブルを追加（分析・監査用）
