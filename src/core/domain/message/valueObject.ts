import { BusinessRuleError } from "@/core/domain/error";
import { MessageErrorCode } from "./errorCode";

export type ReplyToken = string & { readonly brand: "ReplyToken" };

export function createReplyToken(value: string): ReplyToken {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      MessageErrorCode.InvalidReplyToken,
      "ReplyToken cannot be empty",
    );
  }
  return value as ReplyToken;
}

export type UserId = string & { readonly brand: "UserId" };

export function createUserId(value: string): UserId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      MessageErrorCode.InvalidEventSource,
      "UserId cannot be empty",
    );
  }
  return value as UserId;
}

export type EventSource = Readonly<{
  type: "user" | "group" | "room";
  userId?: UserId;
  groupId?: string;
  roomId?: string;
}>;

export function createEventSource(params: {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}): EventSource {
  // userタイプの場合はuserIdが必須
  if (params.type === "user" && !params.userId) {
    throw new BusinessRuleError(
      MessageErrorCode.InvalidEventSource,
      "userId is required for user type",
    );
  }
  // groupタイプの場合はgroupIdが必須
  if (params.type === "group" && !params.groupId) {
    throw new BusinessRuleError(
      MessageErrorCode.InvalidEventSource,
      "groupId is required for group type",
    );
  }
  // roomタイプの場合はroomIdが必須
  if (params.type === "room" && !params.roomId) {
    throw new BusinessRuleError(
      MessageErrorCode.InvalidEventSource,
      "roomId is required for room type",
    );
  }
  return {
    type: params.type,
    userId: params.userId ? (params.userId as UserId) : undefined,
    groupId: params.groupId,
    roomId: params.roomId,
  };
}

export function getEventSourceDestination(source: EventSource): string {
  // Push API用の送信先IDを取得
  switch (source.type) {
    case "user":
      return source.userId as string;
    case "group":
      return source.groupId as string;
    case "room":
      return source.roomId as string;
  }
}

export type TextMessageContent = Readonly<{
  type: "text";
  text: string;
}>;

export type MessageContent = TextMessageContent;

export function createTextMessageContent(text: string): TextMessageContent {
  return {
    type: "text",
    text,
  };
}
