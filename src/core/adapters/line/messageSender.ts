import type { ReplyMessage } from "@/core/domain/message/entity";
import type { MessageSender } from "@/core/domain/message/ports/messageSender";
import type { MessageContent } from "@/core/domain/message/valueObject";
import type { LineApiClient } from "./lineApiClient";

/**
 * LINE用MessageSenderアダプター
 *
 * 動的コンテンツ（LLMの回答など）の送信を担当する
 */
export class LineMessageSender implements MessageSender {
  constructor(private readonly client: LineApiClient) {}

  async reply(replyMessage: ReplyMessage): Promise<void> {
    await this.client.reply(
      replyMessage.replyToken as string,
      replyMessage.messages,
    );
  }

  async push(to: string, messages: MessageContent[]): Promise<void> {
    await this.client.push(to, messages);
  }
}
