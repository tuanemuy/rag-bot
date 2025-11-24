import { z } from "zod";

// LINE Webhook event source schemas
const userSourceSchema = z.object({
  type: z.literal("user"),
  userId: z.string(),
});

const groupSourceSchema = z.object({
  type: z.literal("group"),
  groupId: z.string(),
  userId: z.string().optional(),
});

const roomSourceSchema = z.object({
  type: z.literal("room"),
  roomId: z.string(),
  userId: z.string().optional(),
});

const sourceSchema = z.discriminatedUnion("type", [
  userSourceSchema,
  groupSourceSchema,
  roomSourceSchema,
]);

// LINE message content schemas
const textMessageSchema = z.object({
  type: z.literal("text"),
  id: z.string(),
  text: z.string(),
});

// Other message types (minimal schema for type discrimination)
const imageMessageSchema = z.object({
  type: z.literal("image"),
  id: z.string(),
});

const videoMessageSchema = z.object({
  type: z.literal("video"),
  id: z.string(),
});

const audioMessageSchema = z.object({
  type: z.literal("audio"),
  id: z.string(),
});

const fileMessageSchema = z.object({
  type: z.literal("file"),
  id: z.string(),
});

const locationMessageSchema = z.object({
  type: z.literal("location"),
  id: z.string(),
});

const stickerMessageSchema = z.object({
  type: z.literal("sticker"),
  id: z.string(),
});

const messageSchema = z.discriminatedUnion("type", [
  textMessageSchema,
  imageMessageSchema,
  videoMessageSchema,
  audioMessageSchema,
  fileMessageSchema,
  locationMessageSchema,
  stickerMessageSchema,
]);

// LINE webhook event schemas
const messageEventSchema = z.object({
  type: z.literal("message"),
  replyToken: z.string(),
  source: sourceSchema,
  timestamp: z.number(),
  message: messageSchema,
});

const followEventSchema = z.object({
  type: z.literal("follow"),
  replyToken: z.string(),
  source: sourceSchema,
  timestamp: z.number(),
});

const unfollowEventSchema = z.object({
  type: z.literal("unfollow"),
  source: sourceSchema,
  timestamp: z.number(),
});

const joinEventSchema = z.object({
  type: z.literal("join"),
  replyToken: z.string(),
  source: sourceSchema,
  timestamp: z.number(),
});

const leaveEventSchema = z.object({
  type: z.literal("leave"),
  source: sourceSchema,
  timestamp: z.number(),
});

const postbackEventSchema = z.object({
  type: z.literal("postback"),
  replyToken: z.string(),
  source: sourceSchema,
  timestamp: z.number(),
  postback: z.object({
    data: z.string(),
  }),
});

// Combined event schema
export const webhookEventSchema = z.discriminatedUnion("type", [
  messageEventSchema,
  followEventSchema,
  unfollowEventSchema,
  joinEventSchema,
  leaveEventSchema,
  postbackEventSchema,
]);

// LINE webhook request body schema
export const webhookBodySchema = z.object({
  destination: z.string(),
  events: z.array(webhookEventSchema),
});

export type WebhookBody = z.infer<typeof webhookBodySchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type MessageEvent = z.infer<typeof messageEventSchema>;
export type TextMessage = z.infer<typeof textMessageSchema>;
