import type { ReplyMessage } from "@/core/domain/message/entity";
import type { MessageSender } from "@/core/domain/message/ports/messageSender";
import type { MessageContent } from "@/core/domain/message/valueObject";

export class EmptyMessageSender implements MessageSender {
  async reply(_replyMessage: ReplyMessage): Promise<void> {
    // No-op
  }

  async push(_to: string, _messages: MessageContent[]): Promise<void> {
    // No-op
  }
}
