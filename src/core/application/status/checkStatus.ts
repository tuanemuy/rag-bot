import type { ReplyToken } from "@/core/domain/message/valueObject";
import type { IndexStatus } from "@/core/domain/vectorIndex";
import type { Container } from "../container";

/**
 * ステータス確認ユースケースの入力
 */
export type CheckStatusInput = {
  replyToken: ReplyToken;
};

/**
 * ステータス確認ユースケースの出力
 */
export type CheckStatusOutput = {
  indexStatus: IndexStatus;
};

/**
 * UC-STATUS-001: インデックス状態を確認する
 *
 * インデックスが利用可能かどうかを確認する
 */
export async function checkStatus(
  container: Container,
  input: CheckStatusInput,
): Promise<CheckStatusOutput> {
  const { replyToken } = input;

  // 1. インデックスのステータス情報を取得する
  const indexStatus = await container.indexBuilder.getStatus();

  // 2. ステータスメッセージを返信する（定型通知なのでUserNotifierを使用）
  await container.userNotifier.notifyStatus(replyToken, indexStatus);

  return {
    indexStatus,
  };
}
