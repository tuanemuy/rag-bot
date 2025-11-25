# Sample Usage of LlamaIndex

```typescript
import { 
  VectorStoreIndex, 
  Document, 
  PGVectorStore, 
  storageContextFromDefaults,
  Settings
} from "llamaindex";
import { Gemini, GeminiEmbedding } from "@llamaindex/google";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  // ---------------------------------------------------------
  // 0. Geminiの設定 (ここが変更点)
  // ---------------------------------------------------------
  
  // LLM (文章生成用): Gemini 1.5 Flash (高速・安価) を指定
  Settings.llm = new Gemini({
    model: "gemini-1.5-flash",
  });

  // Embedding (ベクトル化用): text-embedding-004 を指定
  // ※ このモデルの出力次元数は 768 です
  Settings.embedModel = new GeminiEmbedding({
    model: "models/text-embedding-004",
  });

  console.log("🔄 PostgreSQL (pgvector) に接続中...");

  // ---------------------------------------------------------
  // 1. PGVectorStore の初期化
  // ---------------------------------------------------------
  const vectorStore = new PGVectorStore({
    connectionString: "postgres://myuser:mypassword@localhost:5432/mydb",
    schemaName: "public",
    // ⚠️ 重要: OpenAI版を実行済みの場合はテーブル名を変えてください。
    // OpenAI(1536次元)とGemini(768次元)は混ぜて保存できません。
    tableName: "vector_store_gemini", 
  });

  // ---------------------------------------------------------
  // 2. ダミーデータの作成
  // ---------------------------------------------------------
  const documents = [
    new Document({ text: "Gemini 1.5 Proは、Googleが開発したマルチモーダルAIモデルです。", id_: "doc1" }),
    new Document({ text: "pgvectorを使うと、Geminiで生成したベクトルをSQLで検索できます。", id_: "doc2" }),
    new Document({ text: "LlamaIndex TS版は、Node.js環境でRAGを構築するためのライブラリです。", id_: "doc3" }),
  ];

  console.log("📥 ドキュメントをGeminiでEmbeddingして保存中...");

  // ---------------------------------------------------------
  // 3. インデックスの作成と保存
  // ---------------------------------------------------------
  const storageContext = await storageContextFromDefaults({
    vectorStore,
  });

  const index = await VectorStoreIndex.fromDocuments(documents, {
    storageContext,
  });

  console.log("✅ 保存完了。Geminiに質問します。");

  // ---------------------------------------------------------
  // 4. 検索と回答生成
  // ---------------------------------------------------------
  const queryEngine = index.asQueryEngine();
  
  const query = "Gemini 1.5 Proとはどのようなモデルですか？";
  console.log(`❓ 質問: ${query}`);

  const response = await queryEngine.query({
    query: query,
  });

  console.log("--------------------------------------------------");
  console.log(`🤖 Geminiの回答: ${response.toString()}`);
  console.log("--------------------------------------------------");
  
  // 参照ソースの確認
  response.sourceNodes?.forEach((node) => {
    console.log(`- スコア: ${node.score?.toFixed(4)} / 内容: ${node.node.getContent(undefined).substring(0, 50)}...`);
  });
}

main().catch(console.error);
```
