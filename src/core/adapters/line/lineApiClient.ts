import { messagingApi } from "@line/bot-sdk";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { MessageContent } from "@/core/domain/message/valueObject";

export type LineApiClientConfig = {
  channelAccessToken: string;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
};

/**
 * LINE APIクライアント
 *
 * MessageSenderとUserNotifierの両方が使用する共通クライアント
 * リトライロジックを一箇所に集約する
 */
export class LineApiClient {
  private readonly client: messagingApi.MessagingApiClient;
  private readonly maxRetries: number;
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly backoffMultiplier: number;

  constructor(config: LineApiClientConfig) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });
    this.maxRetries = config.maxRetries ?? 3;
    this.initialDelayMs = config.initialDelayMs ?? 1000;
    this.maxDelayMs = config.maxDelayMs ?? 10000;
    this.backoffMultiplier = config.backoffMultiplier ?? 2;
  }

  /**
   * Reply APIを呼び出す
   * リトライ処理込み
   */
  async reply(replyToken: string, messages: MessageContent[]): Promise<void> {
    const lineMessages = messages.map((msg) => this.toLineMessage(msg));

    await this.withRetry(async () => {
      await this.client.replyMessage({
        replyToken,
        messages: lineMessages,
      });
    }, "Failed to reply message");
  }

  /**
   * Push APIを呼び出す
   * リトライ処理込み
   */
  async push(to: string, messages: MessageContent[]): Promise<void> {
    const lineMessages = messages.map((msg) => this.toLineMessage(msg));

    await this.withRetry(async () => {
      await this.client.pushMessage({
        to,
        messages: lineMessages,
      });
    }, "Failed to push message");
  }

  private toLineMessage(content: MessageContent): messagingApi.Message {
    switch (content.type) {
      case "text":
        return {
          type: "text",
          text: content.text,
        };
      default:
        throw new SystemError(
          SystemErrorCode.InternalServerError,
          `Unsupported message type: ${(content as { type: string }).type}`,
        );
    }
  }

  private async withRetry(
    fn: () => Promise<void>,
    errorMessage: string,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await fn();
        return;
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error)) {
          throw new SystemError(
            SystemErrorCode.InternalServerError,
            errorMessage,
            error,
          );
        }

        if (attempt < this.maxRetries) {
          const delay = Math.min(
            this.initialDelayMs * this.backoffMultiplier ** attempt,
            this.maxDelayMs,
          );
          await this.sleep(delay);
        }
      }
    }

    throw new SystemError(
      SystemErrorCode.NetworkError,
      errorMessage,
      lastError,
    );
  }

  /**
   * リトライ対象のエラーかどうかを判定する
   *
   * リトライ対象:
   * - ネットワークエラー（ステータスコードなし）
   * - 5xx系サーバーエラー
   * - 429 Too Many Requests
   *
   * リトライ対象外:
   * - 4xx系クライアントエラー（400, 401, 403, 404など、429を除く）
   */
  private isRetryableError(error: unknown): boolean {
    const statusCode = this.getStatusCode(error);

    if (statusCode === null) {
      return true;
    }

    if (statusCode === 429) {
      return true;
    }

    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }

    if (statusCode >= 400 && statusCode < 500) {
      return false;
    }

    return true;
  }

  private getStatusCode(error: unknown): number | null {
    if (error && typeof error === "object") {
      if ("statusCode" in error && typeof error.statusCode === "number") {
        return error.statusCode;
      }
      if ("status" in error && typeof error.status === "number") {
        return error.status;
      }
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
