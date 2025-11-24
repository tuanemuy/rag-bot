import { createReplyMessage } from "@/core/domain/message/entity";
import { splitLongMessage } from "@/core/domain/message/services/splitLongMessage";
import {
  createTextMessageContent,
  type ReplyToken,
} from "@/core/domain/message/valueObject";
import type { IndexStatus } from "@/core/domain/vectorIndex";
import { formatDateTime } from "@/lib/datetime";
import type { Container } from "../container";
import type { Repositories } from "../unitOfWork";

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
  documentCount: number;
  indexStatus: IndexStatus;
};

/**
 * UC-STATUS-001: インデックス状態を確認する
 *
 * インデックスの現在の状態（ドキュメント数、エントリ数、最終更新日時等）を確認する
 */
export async function checkStatus(
  container: Container,
  input: CheckStatusInput,
): Promise<CheckStatusOutput> {
  const { replyToken } = input;

  // 1. インデックスのステータス情報を取得する
  const indexStatus = await container.indexBuilder.getStatus();

  // 2. ドキュメント数を取得する
  const documentCount = await container.unitOfWork.run(
    async ({ documentRepository }: Repositories) => {
      return documentRepository.count();
    },
  );

  // 3. ステータスメッセージを生成する
  const message = createStatusMessage(documentCount, indexStatus);

  // 4. ステータスメッセージを返信する
  const messageChunks = splitLongMessage(message);
  const replyMessage = createReplyMessage(
    replyToken,
    messageChunks.map((text) => createTextMessageContent(text)),
  );
  await container.messageSender.reply(replyMessage);

  return {
    documentCount,
    indexStatus,
  };
}

/**
 * ステータスメッセージを生成する
 *
 * NOTE: メッセージフォーマット生成はプレゼンテーション層の責務。
 * プレゼンテーション層が実装された際に移動を検討する。
 */
function createStatusMessage(
  documentCount: number,
  status: IndexStatus,
): string {
  const lines: string[] = ["インデックス状態:"];

  lines.push(`- ドキュメント数: ${documentCount}件`);
  lines.push(`- エントリ数: ${status.entryCount}件`);

  if (status.lastUpdatedAt) {
    const formattedDate = formatDateTime(status.lastUpdatedAt);
    lines.push(`- 最終更新: ${formattedDate}`);
  } else {
    lines.push("- 最終更新: 不明");
  }

  if (status.isAvailable) {
    lines.push("- ステータス: 利用可能");
  } else {
    lines.push("- ステータス: 利用不可（syncコマンドを実行してください）");
  }

  return lines.join("\n");
}
