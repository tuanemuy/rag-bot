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

export type GroupId = string & { readonly brand: "GroupId" };

export function createGroupId(value: string): GroupId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      MessageErrorCode.InvalidEventSource,
      "GroupId cannot be empty",
    );
  }
  return value as GroupId;
}

export type RoomId = string & { readonly brand: "RoomId" };

export function createRoomId(value: string): RoomId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      MessageErrorCode.InvalidEventSource,
      "RoomId cannot be empty",
    );
  }
  return value as RoomId;
}

export type EventSource = Readonly<{
  type: "user" | "group" | "room";
  userId?: UserId;
  groupId?: GroupId;
  roomId?: RoomId;
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
    userId: params.userId ? createUserId(params.userId) : undefined,
    groupId: params.groupId ? createGroupId(params.groupId) : undefined,
    roomId: params.roomId ? createRoomId(params.roomId) : undefined,
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
    default:
      throw new BusinessRuleError(
        MessageErrorCode.InvalidEventSource,
        `Unknown event source type: ${source.type}`,
      );
  }
}

export type TextMessageContent = Readonly<{
  type: "text";
  text: string;
}>;

export type MessageContent = TextMessageContent;

export const MAX_TEXT_LENGTH = 5000;

export function createTextMessageContent(text: string): TextMessageContent {
  if (!text || text.trim() === "") {
    throw new BusinessRuleError(
      MessageErrorCode.EmptyMessageContent,
      "Message text cannot be empty",
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new BusinessRuleError(
      MessageErrorCode.MessageTooLong,
      `Message text cannot exceed ${MAX_TEXT_LENGTH} characters`,
    );
  }
  return {
    type: "text",
    text,
  };
}
