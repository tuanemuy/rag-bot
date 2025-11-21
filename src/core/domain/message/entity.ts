import type { MessageContent, ReplyToken } from "./valueObject";

export type ReplyMessage = Readonly<{
  replyToken: ReplyToken;
  messages: MessageContent[];
}>;

export function createReplyMessage(
  replyToken: ReplyToken,
  messages: MessageContent[],
): ReplyMessage {
  return {
    replyToken,
    messages,
  };
}
