import type { ReplyMessage } from "../entity";
import type { MessageContent } from "../valueObject";

export interface MessageSender {
  /**
   * 返信メッセージを送信する
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @param replyMessage - 送信するReplyMessageエンティティ（replyTokenとmessagesを含む）
   * @throws SystemError - 最大リトライ回数を超えてもLINE API呼び出しに失敗した場合
   */
  reply(replyMessage: ReplyMessage): Promise<void>;

  /**
   * プッシュメッセージを送信する（非同期処理完了通知用）
   * リトライ処理はアダプター実装で行う（指数バックオフ）
   * @param to - 送信先（userId, groupId, roomId）
   * @param messages - 送信するMessageContent配列
   * @throws SystemError - 最大リトライ回数を超えてもLINE API呼び出しに失敗した場合
   */
  push(to: string, messages: MessageContent[]): Promise<void>;
}
