import { validateSignature } from "@line/bot-sdk";
import type { Context, Next } from "hono";
import {
  UnauthenticatedError,
  UnauthenticatedErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import type { HonoEnv } from "../app";
import { type WebhookBody, webhookBodySchema } from "./schema";

export type LineHonoEnv = HonoEnv & {
  Variables: HonoEnv["Variables"] & {
    webhookBody: WebhookBody;
  };
};

export function verifyLineSignature() {
  return async (c: Context<LineHonoEnv>, next: Next) => {
    // Get signature and channel secret
    const signature = c.req.header("x-line-signature");
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!signature || !channelSecret) {
      throw new UnauthenticatedError(
        UnauthenticatedErrorCode.InvalidToken,
        "Missing LINE signature or channel secret",
      );
    }

    // Get raw body for signature verification
    const rawBody = await c.req.text();

    // Verify signature
    if (!validateSignature(rawBody, channelSecret, signature)) {
      throw new UnauthenticatedError(
        UnauthenticatedErrorCode.InvalidToken,
        "Invalid LINE signature",
      );
    }

    // Parse and validate webhook body with zod
    let body: WebhookBody;
    try {
      const parsed = JSON.parse(rawBody);
      const result = webhookBodySchema.safeParse(parsed);
      if (!result.success) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          `Invalid webhook body: ${result.error.message}`,
        );
      }
      body = result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        "Invalid JSON in request body",
      );
    }

    // Set validated body to context
    c.set("webhookBody", body);

    await next();
  };
}
