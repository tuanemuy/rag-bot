# Answer ドメイン

質問応答に関するドメイン。RAG検索とLLMによる回答生成を担当する。

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
    throw new BusinessRuleError("ANSWER_EMPTY_QUESTION", "Question cannot be empty");
  }
  // 空の回答内容をチェック
  if (!params.content || (params.content as string).trim() === "") {
    throw new BusinessRuleError("ANSWER_EMPTY_CONTENT", "Answer content cannot be empty");
  }
  return params;
}

function createAnswerFromContext(
  id: AnswerId,
  content: AnswerContent,
  context: RetrievalContext,
  generatedAt: Date
): Answer {
  const sources = context.retrievedDocuments.map((doc, index) => ({
    id: `${id}-source-${index}` as AnswerSourceId,
    documentId: doc.documentId,
    documentTitle: doc.title,
    relevantContent: doc.content,
    score: doc.score,
  }));
  return {
    id,
    question: context.query,
    content,
    sources,
    generatedAt,
  };
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

### RetrievalContext

RAG検索で取得したコンテキストを表す。

```typescript
type RetrievalContext = Readonly<{
  query: Question;
  retrievedDocuments: RetrievedDocument[];
}>;
```

### RetrievedDocument

検索で取得したドキュメント情報を表す。

```typescript
type RetrievedDocument = Readonly<{
  documentId: DocumentId;
  title: string;
  content: string;
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

### DocumentId

ドキュメントの一意識別子。共通型定義（`shared`）を参照する。

```typescript
// src/core/domain/shared/documentId.ts から参照
type DocumentId = string & { readonly brand: "DocumentId" };
```

### SimilarityScore

類似度スコア（0-1の範囲）。共通型定義（`shared`）を参照する。

```typescript
// src/core/domain/shared/similarityScore.ts から参照
type SimilarityScore = number & { readonly brand: "SimilarityScore" };
```

### PromptTemplate

LLMへのプロンプトテンプレート。

```typescript
type PromptTemplate = string & { readonly brand: "PromptTemplate" };
```

## エラーコード

Answerドメインで使用するエラーコード。

```typescript
const AnswerErrorCode = {
  // コンテキスト取得エラー
  CONTEXT_RETRIEVAL_FAILED: "ANSWER_CONTEXT_RETRIEVAL_FAILED",
  NO_RELEVANT_DOCUMENTS: "ANSWER_NO_RELEVANT_DOCUMENTS",

  // 回答生成エラー
  GENERATION_FAILED: "ANSWER_GENERATION_FAILED",
  LLM_API_ERROR: "ANSWER_LLM_API_ERROR",

  // インデックスエラー
  INDEX_NOT_AVAILABLE: "ANSWER_INDEX_NOT_AVAILABLE",

  // 永続化エラー
  SAVE_FAILED: "ANSWER_SAVE_FAILED",

  // バリデーションエラー
  EMPTY_QUESTION: "ANSWER_EMPTY_QUESTION",
  EMPTY_CONTENT: "ANSWER_EMPTY_CONTENT",
} as const;

type AnswerErrorCode = typeof AnswerErrorCode[keyof typeof AnswerErrorCode];
```

## ポート

### AnswerGenerator

LLMを使用して回答を生成するインターフェース。

```typescript
interface AnswerGenerator {
  /**
   * コンテキストと質問から回答を生成する
   * @throws SystemError - LLM API呼び出しに失敗した場合
   */
  generate(context: RetrievalContext): Promise<AnswerContent>;
}
```

### PromptBuilder（アダプター実装詳細）

**注意**: PromptBuilderはドメインのポートではなく、AnswerGeneratorアダプターの実装詳細として扱う。

AnswerGeneratorアダプターがLLMへのプロンプトを構築する際に内部で使用するヘルパーであり、以下の理由からポートとして定義しない:

- プロンプト構築はLLMプロバイダー固有の実装詳細
- アダプター外部から注入する必要がない
- 設定の`llm.systemPrompt`で基本設定は変更可能

```typescript
// アダプター実装例（src/core/adapters/openai/promptBuilder.ts）
function buildPrompt(context: RetrievalContext, systemPrompt: string): string {
  // プロンプト構築ロジック
}
```

## ドメインサービス

### buildRetrievalContext

検索結果からRetrievalContextを構築する純粋関数。

```typescript
// SearchResultInputはAnswerドメインで定義する入力型
// 注: RetrievedDocumentと構造が類似しているが、以下の理由で別型として定義
// - SearchResultInput: VectorIndexドメインからの入力を受け取るための型（ドメイン間の疎結合を維持）
// - RetrievedDocument: Answerドメイン内部で使用するコンテキスト情報
// 将来的に共通の中間型をsharedに配置することも検討可能
type SearchResultInput = Readonly<{
  entry: {
    documentId: DocumentId;
    documentTitle: string;
    content: string;
  };
  score: SimilarityScore;
}>;

/**
 * 検索結果からRetrievalContextを構築する
 * 純粋関数として実装（外部依存なし）
 */
function buildRetrievalContext(
  question: Question,
  searchResults: SearchResultInput[]
): RetrievalContext {
  const retrievedDocuments = searchResults.map((result) => ({
    documentId: result.entry.documentId,
    title: result.entry.documentTitle,
    content: result.entry.content,
    score: result.score,
  }));

  return {
    query: question,
    retrievedDocuments,
  };
}
```

**設計意図**:

- 検索結果をAnswerドメインが必要とするRetrievalContext形式に変換する純粋関数
- 外部システムへの依存がないため、ポートではなくドメインサービスとして定義
- アプリケーション層がVectorIndex.SearchVectorIndexで検索を実行し、その結果をこの関数に渡す

**SearchResultInput型について**:

- VectorIndexドメインのSearchResult型への依存を避けるため、必要フィールドのみを持つ中間型を定義
- アプリケーション層でVectorIndexのSearchResultからSearchResultInputへの変換を行う
- これにより、ドメイン間の結合度を低く保つ

**注意**: コンテキストの取得（VectorIndexの検索）はアプリケーション層の責務であり、Answerドメインはすでに取得済みの検索結果を受け取る

### AnswerRepository（オプショナル）

回答を永続化するインターフェース。分析・監査・デバッグ目的で使用する。

**目的**:
- 回答品質の分析・改善のためのデータ収集
- 問題発生時のデバッグ情報として活用
- 監査ログとしての回答履歴保持

**実装方針**:
- 初期実装では省略可能
- 必要に応じて後から追加実装

**永続化タイミング**:
- アプリケーション層のGenerateAndReplyAnswerユースケースで、回答生成後・返信前に永続化を実行
- ドメインサービス（GenerateAnswer）は永続化を行わない
- 永続化の実行有無はアプリケーション層の設定で制御可能とする

```typescript
interface AnswerRepository {
  /**
   * 回答を保存する
   * @throws SystemError - 保存に失敗した場合
   */
  save(answer: Answer): Promise<void>;

  /**
   * 回答履歴を取得する
   */
  findRecent(limit: number): Promise<Answer[]>;

  /**
   * 指定期間の回答を取得する（分析用）
   * @param from - 開始日時
   * @param to - 終了日時
   * @param options - ページネーションオプション
   * @returns 回答のリストと総件数
   */
  findByDateRange(
    from: Date,
    to: Date,
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: Answer[]; total: number }>;
}
```

## アプリケーション層での利用

ポートの呼び出しはアプリケーション層が行う。Answerドメインのポートを使用した処理フローはGenerateAndReplyAnswerユースケース（`spec/domains/index.md`参照）を参照。

**注意**: Answerエンティティのファクトリ関数（createAnswerFromContext, createNoRelevantDocumentsAnswer, createIndexNotBuiltAnswer等）がビジネスロジックを担当する。複数の集約にまたがる複雑なロジックが必要な場合のみドメインサービスを追加する。
