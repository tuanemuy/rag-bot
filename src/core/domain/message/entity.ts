import { BusinessRuleError } from "@/core/domain/error";
import { MessageErrorCode } from "./errorCode";
import type { MessageContent, ReplyToken } from "./valueObject";

export type ReplyMessage = Readonly<{
  replyToken: ReplyToken;
  messages: MessageContent[];
}>;

export function createReplyMessage(
  replyToken: ReplyToken,
  messages: MessageContent[],
): ReplyMessage {
  if (messages.length === 0) {
    throw new BusinessRuleError(
      MessageErrorCode.EmptyMessages,
      "Messages array cannot be empty",
    );
  }
  return {
    replyToken,
    messages,
  };
}
