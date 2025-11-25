# プレゼンテーション層の肥大化に対する改善提案

## 現状の問題

`src/api/line/routes.ts` に以下の責務が集中している：

1. メッセージのパース（`parseCommand`, `extractQuestionText`）
2. イベントタイプの振り分け（`processEvent`）
3. メッセージイベントの処理（`handleMessageEvent`）
4. EventSourceオブジェクトの構築
5. 各ユースケースの呼び出し

これにより、プレゼンテーション層が肥大化し、テストしづらく、変更に弱い構造になっている。

## 改善案

### 案1: Application Service層にメッセージディスパッチャーを作成（推奨）

**アプローチ:**
- Domain層: コマンド型定義とパーサーロジック（Domain Service）
- Application層: メッセージ処理のオーケストレーション（Application Service）
- Presentation層: 最小限のルーティング

**メリット:**
- プレゼンテーション層が薄くなる
- ビジネスロジックが適切な層に配置される
- ユニットテストが書きやすい
- LINEだけでなく他のメッセージングプラットフォームでも再利用可能

**構造:**
```
src/core/domain/message/
  - command.ts                     # Command型定義、パーサー（Domain Service）

src/core/application/message/
  - processLineMessage.ts          # LINEメッセージ処理のオーケストレーション

src/api/line/
  - routes.ts                      # 薄いルーティング層
```

**実装例:**

```typescript
// src/core/domain/message/command.ts
export type Command =
  | { type: "sync" }
  | { type: "status" }
  | { type: "question"; text: string }
  | { type: "message"; text: string };

export function parseCommand(text: string): Command {
  const trimmed = text.trim();
  const lowerTrimmed = trimmed.toLowerCase();

  if (lowerTrimmed === "sync") {
    return { type: "sync" };
  }
  if (lowerTrimmed === "status") {
    return { type: "status" };
  }
  if (trimmed.startsWith("query:") || trimmed.startsWith("Query:")) {
    const questionText = trimmed.slice(6).trim();
    return { type: "question", text: questionText };
  }
  return { type: "message", text: trimmed };
}

// src/core/application/message/processLineMessage.ts
export type LineMessageInput = {
  replyToken: string;
  eventSource: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  messageText: string;
};

export async function processLineMessage(
  container: Container,
  input: LineMessageInput
): Promise<void> {
  const command = parseCommand(input.messageText);
  const eventSource = createEventSource(input.eventSource);
  const replyToken = createReplyToken(input.replyToken);

  switch (command.type) {
    case "sync":
      // バックグラウンド実行
      syncDocuments(container, { replyToken, eventSource }).catch((error) => {
        container.logger.error("Background sync failed", error);
      });
      break;

    case "status":
      await checkStatus(container, { replyToken });
      break;

    case "question":
      await answerQuestion(container, {
        replyToken,
        questionText: command.text,
        topK: 5,
      });
      break;

    case "message":
      container.logger.info("Regular message received, ignoring", {
        text: command.text,
      });
      break;
  }
}

// src/api/line/routes.ts (薄くなる)
async function handleMessageEvent(
  container: Container,
  event: MessageEvent,
): Promise<void> {
  if (event.message.type !== "text") {
    container.logger.info("Non-text message received, ignoring");
    return;
  }

  await processLineMessage(container, {
    replyToken: event.replyToken,
    eventSource: {
      type: event.source.type,
      userId: "userId" in event.source ? event.source.userId : undefined,
      groupId: "groupId" in event.source ? event.source.groupId : undefined,
      roomId: "roomId" in event.source ? event.source.roomId : undefined,
    },
    messageText: event.message.text,
  });
}
```

---

### 案2: Adapter層にメッセージハンドラーを作成

**アプローチ:**
- Adapter層にLINEメッセージハンドラーを実装
- プレゼンテーション層からアダプターを呼び出す

**メリット:**
- LINEに特化した処理をアダプターとしてカプセル化
- プレゼンテーション層が薄くなる

**デメリット:**
- アダプターとアプリケーションサービスの境界が曖昧になる
- ビジネスロジック（コマンドの解釈）がアダプター層に漏れる可能性

---

### 案3: ドメインイベントパターンの導入

**アプローチ:**
- LINEイベントをドメインイベントに変換
- ドメインイベントハンドラーが各ユースケースを呼び出す

**メリット:**
- イベント駆動アーキテクチャとの相性が良い
- 拡張性が高い（新しいイベントタイプの追加が容易）

**デメリット:**
- 複雑度が増す
- 現在の要件に対してはオーバーエンジニアリング

---

## 推奨

**案1: Application Service層にメッセージディスパッチャーを作成**

理由：
1. 責務の分離が明確
2. テストが容易
3. 適切な複雑さ（オーバーエンジニアリングでない）
4. 他のメッセージングプラットフォーム対応時に再利用可能
5. ヘキサゴナルアーキテクチャの原則に沿っている

## 実装の流れ

1. `src/core/domain/message/command.ts` を作成
   - Command型とparseCommand関数を定義

2. `src/core/application/message/processLineMessage.ts` を作成
   - メッセージ処理のオーケストレーションロジックを実装
   - テストを作成

3. `src/api/line/routes.ts` をリファクタリング
   - processLineMessage を呼び出すだけに簡素化
   - parseCommand, extractQuestionText 関数を削除

4. 型チェックとテストを実行

## 追加の考慮事項

- `EventSource` の構築ロジックもヘルパー関数として切り出すと良い
- 今後、ボタンやクイックリプライなどのインタラクティブな要素を追加する場合、同じパターンで拡張可能
