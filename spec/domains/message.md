# Message ドメイン

LINEメッセージングに関するドメイン。メッセージの送信を担当する。

**責務の範囲**:
- メッセージの送信（Reply/Push）

**責務外**:
- Webhook署名の検証 → プレゼンテーション層が担当
- Webhookイベントの解析 → プレゼンテーション層が担当
- コマンドの識別 → プレゼンテーション層が担当
- 他ドメインのユースケース呼び出し（オーケストレーション）→ プレゼンテーション層が担当

## エンティティ

### ReplyMessage

送信する返信メッセージを表す。

```typescript
type ReplyMessage = Readonly<{
  replyToken: ReplyToken;
  messages: MessageContent[];
}>;
```

## 値オブジェクト

### ReplyToken

返信用トークン。

```typescript
type ReplyToken = string & { readonly brand: "ReplyToken" };
```

### UserId

LINEユーザーの一意識別子。

```typescript
type UserId = string & { readonly brand: "UserId" };
```

### EventSource

Webhookイベントの送信元情報。Push API送信時の送信先特定に使用する。

```typescript
// GroupIdとRoomIdもBranded型として定義
type GroupId = string & { readonly brand: "GroupId" };
type RoomId = string & { readonly brand: "RoomId" };

function createGroupId(value: string): GroupId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError("INVALID_EVENT_SOURCE", "GroupId cannot be empty");
  }
  return value as GroupId;
}

function createRoomId(value: string): RoomId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError("INVALID_EVENT_SOURCE", "RoomId cannot be empty");
  }
  return value as RoomId;
}

type EventSource = Readonly<{
  type: "user" | "group" | "room";
  userId?: UserId;
  groupId?: GroupId;
  roomId?: RoomId;
}>;

function createEventSource(params: {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}): EventSource {
  // userタイプの場合はuserIdが必須
  if (params.type === "user" && !params.userId) {
    throw new BusinessRuleError("INVALID_EVENT_SOURCE", "userId is required for user type");
  }
  // groupタイプの場合はgroupIdが必須
  if (params.type === "group" && !params.groupId) {
    throw new BusinessRuleError("INVALID_EVENT_SOURCE", "groupId is required for group type");
  }
  // roomタイプの場合はroomIdが必須
  if (params.type === "room" && !params.roomId) {
    throw new BusinessRuleError("INVALID_EVENT_SOURCE", "roomId is required for room type");
  }
  return {
    type: params.type,
    userId: params.userId ? createUserId(params.userId) : undefined,
    groupId: params.groupId ? createGroupId(params.groupId) : undefined,
    roomId: params.roomId ? createRoomId(params.roomId) : undefined,
  };
}

function getEventSourceDestination(source: EventSource): string {
  // Push API用の送信先IDを取得
  switch (source.type) {
    case "user":
      return source.userId as string;
    case "group":
      return source.groupId as string;
    case "room":
      return source.roomId as string;
    default:
      throw new BusinessRuleError("INVALID_EVENT_SOURCE", `Unknown event source type: ${source.type}`);
  }
}
```

**使用場面**:

EventSourceは以下のフローで使用される:

1. **プレゼンテーション層**: Webhookイベントからソース情報を抽出し、`createEventSource`でEventSourceを生成
2. **ユースケースへの受け渡し**: UC-SYNC-001等の非同期処理を行うユースケースにEventSourceを渡す
3. **Push通知の送信**: 非同期処理完了後、`getEventSourceDestination`で送信先IDを取得し、MessageSender.pushで通知

```typescript
// プレゼンテーション層での使用例
const eventSource = createEventSource({
  type: webhookEvent.source.type,
  userId: webhookEvent.source.userId,
  groupId: webhookEvent.source.groupId,
  roomId: webhookEvent.source.roomId,
});

// ユースケースに渡す
await syncAndBuildIndex(eventSource, replyToken, context);

// ユースケース内での使用例（Push通知）
const destination = getEventSourceDestination(eventSource);
await context.messageSender.push(destination, [{ type: "text", text: "同期が完了しました" }]);
```

**関連ユースケース**: UC-SYNC-001（ドキュメントを同期する）

### MessageContent

送信するメッセージの内容。現時点ではテキストメッセージのみをサポートする。

```typescript
type MessageContent = TextMessageContent;

type TextMessageContent = Readonly<{
  type: "text";
  text: string;
}>;

// 将来の拡張例（必要に応じて追加）
// type ImageMessageContent = Readonly<{
//   type: "image";
//   originalContentUrl: string;
//   previewImageUrl: string;
// }>;
```

## エラーコード

Messageドメインで使用するエラーコード。

```typescript
const MessageErrorCode = {
  // メッセージ送信エラー
  REPLY_FAILED: "MESSAGE_REPLY_FAILED",
  PUSH_FAILED: "MESSAGE_PUSH_FAILED",
  MESSAGE_TOO_LONG: "MESSAGE_TOO_LONG",

  // トークンエラー
  INVALID_REPLY_TOKEN: "MESSAGE_INVALID_REPLY_TOKEN",
  EXPIRED_REPLY_TOKEN: "MESSAGE_EXPIRED_REPLY_TOKEN",

  // EventSourceエラー
  INVALID_EVENT_SOURCE: "MESSAGE_INVALID_EVENT_SOURCE",
} as const;

type MessageErrorCode = typeof MessageErrorCode[keyof typeof MessageErrorCode];
```

## ドメインサービス

### splitLongMessage

長文メッセージを分割する純粋関数。

```typescript
/**
 * 長文メッセージをLINE APIの制限（5000文字）に合わせて分割する
 *
 * @param text - 分割対象のテキスト
 * @returns 分割されたメッセージの配列（最大5件）
 *
 * 分割アルゴリズム:
 * 1. 5000文字を超える場合、直前の句点（。）または改行（\n）で分割
 * 2. 句点も改行もない場合は5000文字で強制分割
 * 3. 分割後も5000文字を超える場合は再帰的に分割
 * 4. 5メッセージを超える場合は末尾に「...続きは省略されました」を付与して打ち切り
 */
function splitLongMessage(text: string): string[] {
  const MAX_LENGTH = 5000;
  const MAX_MESSAGES = 5;

  if (text.length <= MAX_LENGTH) {
    return [text];
  }

  const messages: string[] = [];
  let remaining = text;

  while (remaining.length > 0 && messages.length < MAX_MESSAGES) {
    if (remaining.length <= MAX_LENGTH) {
      messages.push(remaining);
      break;
    }

    // 分割位置を探す
    const searchRange = remaining.substring(0, MAX_LENGTH);
    const lastPeriod = searchRange.lastIndexOf("。");
    const lastNewline = searchRange.lastIndexOf("\n");
    const splitPos = Math.max(lastPeriod, lastNewline);

    if (splitPos > 0) {
      messages.push(remaining.substring(0, splitPos + 1));
      remaining = remaining.substring(splitPos + 1);
    } else {
      // 区切り文字がない場合は強制分割
      messages.push(remaining.substring(0, MAX_LENGTH));
      remaining = remaining.substring(MAX_LENGTH);
    }
  }

  // 残りがある場合は省略メッセージを付与
  if (remaining.length > 0 && messages.length === MAX_MESSAGES) {
    const lastMessage = messages[MAX_MESSAGES - 1];
    if (lastMessage.length + 20 <= MAX_LENGTH) {
      messages[MAX_MESSAGES - 1] = lastMessage + "\n\n...続きは省略されました";
    }
  }

  return messages;
}
```

**設計意図**:
- 純粋関数として実装し、テストが容易になるよう設計
- アプリケーション層のSendReply/SendPushユースケースから呼び出される
- LINE APIの制限（1メッセージ5000文字、1回の送信で最大5メッセージ）に対応

## ポート

### MessageSender

メッセージ送信のインターフェース。

```typescript
interface MessageSender {
  /**
   * 返信メッセージを送信する
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @param replyMessage - 送信するReplyMessageエンティティ（replyTokenとmessagesを含む）
   * @throws SystemError - 最大リトライ回数を超えてもLINE API呼び出しに失敗した場合
   */
  reply(replyMessage: ReplyMessage): Promise<void>;

  /**
   * プッシュメッセージを送信する（非同期処理完了通知用）
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @param to - 送信先（userId, groupId, roomId）
   * @param messages - 送信するMessageContent配列
   * @throws SystemError - 最大リトライ回数を超えてもLINE API呼び出しに失敗した場合
   */
  push(to: string, messages: MessageContent[]): Promise<void>;
}
```

**設計意図**:
- `push`メソッドを追加することで、非同期処理完了時の通知が可能になる
- 同期コマンドなど長時間かかる処理は、即座にReplyで「開始しました」を返信し、完了時にPushで結果を通知する

#### リトライポリシー

MessageSenderのアダプター実装は、以下のリトライポリシーに従う。

- **リトライ対象エラー**: ネットワークエラー、5xx系サーバーエラー、429 Too Many Requests
- **リトライ対象外**: 4xx系クライアントエラー（400, 401, 403, 404など）
- **アルゴリズム**: 指数バックオフ（Exponential Backoff）
- **設定**: 設定の`line.retry`を参照
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

#### リトライ失敗時の処理

最大リトライ回数を超えた場合の処理方針:

**Reply APIの場合**:
- **ログ記録**: エラー詳細をログに記録（userId, replyToken, エラー内容, リトライ回数）
- **例外送出**: `SystemError`を送出し、呼び出し元で適切に処理
- **ユーザー通知**: 返信が失敗した場合、ユーザーへの直接通知は不可能なため、ログ記録のみとする

**Push APIの場合**:
- **ログ記録**: エラー詳細をログに記録（to, メッセージ内容, エラー内容, リトライ回数）
- **例外送出**: `SystemError`を送出し、呼び出し元で適切に処理
- **処理継続**: Push通知はバックグラウンド処理の完了通知に使用されるため、通知失敗時も主処理（インデックス更新など）は完了しているものとして扱う
- **フォールバック**: 以下の方法でユーザーが状態を確認できる
  - `status`コマンドでインデックスの状態（最終更新日時、ドキュメント数、エントリ数）を確認
  - 次回の質問実行時にインデックスが利用可能かどうかが分かる

**statusコマンドの応答例**:
```
インデックス状態:
- ドキュメント数: 150件
- エントリ数: 1,234件
- 最終更新: 2025-01-15 10:30:00
- ステータス: 利用可能
```

**共通**:
- **監視**: ログ監視でリトライ失敗が多発する場合はアラートを設定することを推奨

**メトリクス収集（将来の検討事項）**:

運用時の問題検知・分析を容易にするため、以下のメトリクス収集を検討可能:

- **送信成功/失敗率**: Reply/Push APIの成功・失敗件数
- **リトライ回数分布**: 各リクエストのリトライ回数
- **レイテンシ**: API呼び出しの応答時間
- **エラー種別**: エラーコード別の発生件数

**実装方法**:
- PrometheusやDatadog等のメトリクス収集サービスへの送信
- アダプター層でメトリクスを記録し、定期的にエクスポート
- ダッシュボードでリアルタイム監視とアラート設定

**優先度**: 低（初期実装ではログベースの監視で対応）

## アプリケーション層での利用

ポートの呼び出しはアプリケーション層が行う。Messageドメインのポートを使用したメッセージ送信処理は以下のように行われる。

### 返信メッセージの送信

アプリケーション層のユースケース（GenerateAndReplyAnswer, GetIndexStatus等）から呼び出される。

- **入力**: ReplyToken, MessageContent[]（送信するメッセージ）
- **出力**: void
- **処理フロー**:
  1. 各メッセージのテキスト長をチェック
  2. 5000文字を超える場合は`splitLongMessage`ドメインサービスで分割処理を適用
  3. MessageSenderポートを使用して送信
- **長文メッセージの処理方針**:
  - 基本方針: メッセージの**分割**を採用
  - 分割の理由: 情報の欠落を防ぎ、ユーザーが必要な情報を確実に得られるようにする
  - 分割アルゴリズム: `splitLongMessage`ドメインサービスを参照
  - 分割上限: 最大5メッセージ（LINE APIの制限）
  - 5メッセージを超える場合: 末尾に「...続きは省略されました」を付与して打ち切り
  - **情報欠落防止策**: LLM回答生成時のプロンプトで出力長を制限（推奨: 20,000文字以内）
    - システムプロンプトに「回答は簡潔にまとめ、20,000文字以内に収めてください」等の指示を含める
    - これにより5メッセージ（25,000文字）を超える回答の発生を抑制
    - 詳細は設定の`llm.systemPrompt`を参照

### プッシュメッセージの送信

アプリケーション層のSyncAndBuildIndexユースケースから、非同期処理完了時の通知として呼び出される。

- **入力**: string（送信先）, MessageContent[]（送信するメッセージ）
- **出力**: void
- **処理フロー**:
  1. 各メッセージのテキスト長をチェック
  2. 5000文字を超える場合は`splitLongMessage`ドメインサービスで分割処理を適用
  3. MessageSenderポートを使用して送信

**設計意図**:
- 副作用を伴うポートの呼び出しはアプリケーション層の責務
- ドメインサービス（splitLongMessage）は純粋関数として実装
- 外部からの入力（プレゼンテーション層）はバリデーションによりMessageContentに変換
- ドメイン内ではMessageContent型を使用して型安全性を確保
