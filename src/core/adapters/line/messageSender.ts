import { messagingApi } from "@line/bot-sdk";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ReplyMessage } from "@/core/domain/message/entity";
import type { MessageSender } from "@/core/domain/message/ports/messageSender";
import type { MessageContent } from "@/core/domain/message/valueObject";

export type LineMessageSenderConfig = {
  channelAccessToken: string;
  maxRetries?: number;
  retryDelay?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
};

export class LineMessageSender implements MessageSender {
  private readonly client: messagingApi.MessagingApiClient;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly maxDelayMs: number;
  private readonly backoffMultiplier: number;

  constructor(config: LineMessageSenderConfig) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.maxDelayMs = config.maxDelayMs ?? 10000;
    this.backoffMultiplier = config.backoffMultiplier ?? 2;
  }

  async reply(replyMessage: ReplyMessage): Promise<void> {
    const messages = replyMessage.messages.map((msg) =>
      this.toLineMessage(msg),
    );

    await this.withRetry(async () => {
      await this.client.replyMessage({
        replyToken: replyMessage.replyToken,
        messages,
      });
    }, "Failed to reply message");
  }

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

        // リトライ対象外のエラーかチェック
        if (!this.isRetryableError(error)) {
          throw new SystemError(
            SystemErrorCode.InternalServerError,
            errorMessage,
            error,
          );
        }

        if (attempt < this.maxRetries) {
          // 指数バックオフ（最大遅延で上限を設ける）
          const delay = Math.min(
            this.retryDelay * this.backoffMultiplier ** attempt,
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
    // エラーオブジェクトからステータスコードを取得
    const statusCode = this.getStatusCode(error);

    // ステータスコードがない場合（ネットワークエラーなど）はリトライ対象
    if (statusCode === null) {
      return true;
    }

    // 429 Too Many Requestsはリトライ対象
    if (statusCode === 429) {
      return true;
    }

    // 5xx系サーバーエラーはリトライ対象
    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }

    // 4xx系クライアントエラーはリトライ対象外
    if (statusCode >= 400 && statusCode < 500) {
      return false;
    }

    // その他はリトライ対象
    return true;
  }

  private getStatusCode(error: unknown): number | null {
    if (error && typeof error === "object") {
      // LINE Bot SDKのHTTPFetchErrorの形式
      if ("statusCode" in error && typeof error.statusCode === "number") {
        return error.statusCode;
      }
      // 一般的なHTTPエラーの形式
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
