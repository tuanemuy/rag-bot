import { qaMessages } from "@/api/messages";
import { createReplyMessage } from "@/core/domain/message/entity";
import { splitLongMessage } from "@/core/domain/message/services/splitLongMessage";
import {
  createTextMessageContent,
  type ReplyToken,
} from "@/core/domain/message/valueObject";
import {
  type Answer,
  type AnswerContent,
  createAnswerFromQueryResult,
  createIndexNotBuiltAnswer,
  createNoRelevantDocumentsAnswer,
  createQuestion,
  generateAnswerId,
  unwrapAnswerContent,
} from "@/core/domain/vectorIndex";
import type { Container } from "../container";

/**
 * 質問応答ユースケースの入力
 */
export type AnswerQuestionInput = {
  replyToken: ReplyToken;
  questionText: string;
  topK?: number;
};

/**
 * 質問応答ユースケースの出力
 */
export type AnswerQuestionOutput = {
  answer: Answer;
};

/**
 * UC-QA-001: 質問に回答する
 *
 * ユーザーの質問に対してRAGを使用して回答を生成する
 */
export async function answerQuestion(
  container: Container,
  input: AnswerQuestionInput,
): Promise<AnswerQuestionOutput> {
  const { replyToken, questionText, topK = 5 } = input;

  const question = createQuestion(questionText);
  const answerId = generateAnswerId();

  // 1. インデックスの存在を確認する
  const indexStatus = await container.indexBuilder.getStatus();

  if (!indexStatus.isAvailable) {
    // インデックス未構築の場合
    const answer = createIndexNotBuiltAnswer(
      answerId,
      question,
      qaMessages.indexNotBuilt,
    );

    // 回答を返信する
    await sendAnswerReply(container, replyToken, answer.content);

    return {
      answer,
    };
  }

  // 2. RAGで検索と回答生成を実行する
  const queryResult = await container.queryEngine.query(questionText, topK);

  if (queryResult.sources.length === 0) {
    // 関連ドキュメントなしの場合
    const answer = createNoRelevantDocumentsAnswer(
      answerId,
      question,
      qaMessages.noRelevantDocuments,
    );

    // 回答を返信する
    await sendAnswerReply(container, replyToken, answer.content);

    return {
      answer,
    };
  }

  // 3. Answerエンティティを作成する
  const answer = createAnswerFromQueryResult(
    answerId,
    question,
    queryResult,
    new Date(),
  );

  // 4. 回答を返信する
  await sendAnswerReply(container, replyToken, answer.content);

  return {
    answer,
  };
}

/**
 * 回答をLINEに返信する
 */
async function sendAnswerReply(
  container: Container,
  replyToken: ReplyToken,
  answerContent: AnswerContent,
): Promise<void> {
  // 長文の場合は分割
  const messageChunks = splitLongMessage(unwrapAnswerContent(answerContent));
  const messages = messageChunks.map((text) => createTextMessageContent(text));

  const replyMessage = createReplyMessage(replyToken, messages);
  await container.messageSender.reply(replyMessage);
}
