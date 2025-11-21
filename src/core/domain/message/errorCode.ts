export const MessageErrorCode = {
  // メッセージ送信エラー
  ReplyFailed: "MESSAGE_REPLY_FAILED",
  PushFailed: "MESSAGE_PUSH_FAILED",
  MessageTooLong: "MESSAGE_TOO_LONG",

  // トークンエラー
  InvalidReplyToken: "MESSAGE_INVALID_REPLY_TOKEN",
  ExpiredReplyToken: "MESSAGE_EXPIRED_REPLY_TOKEN",

  // EventSourceエラー
  InvalidEventSource: "MESSAGE_INVALID_EVENT_SOURCE",
} as const;

export type MessageErrorCode =
  (typeof MessageErrorCode)[keyof typeof MessageErrorCode];
