import { v7 as uuidv7 } from "uuid";
import { BusinessRuleError } from "@/core/domain/error";
import { AnswerErrorCode } from "./errorCode";

export type { DocumentId, SimilarityScore } from "@/core/domain/shared";
export { createDocumentId, createSimilarityScore } from "@/core/domain/shared";

export type AnswerId = string & { readonly brand: "AnswerId" };

export function createAnswerId(value: string): AnswerId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      AnswerErrorCode.InvalidAnswerId,
      "AnswerId cannot be empty",
    );
  }
  return value as AnswerId;
}

export function generateAnswerId(): AnswerId {
  return uuidv7() as AnswerId;
}

export type AnswerSourceId = string & { readonly brand: "AnswerSourceId" };

export function generateAnswerSourceId(
  answerId: AnswerId,
  index: number,
): AnswerSourceId {
  return `${answerId}-source-${index}` as AnswerSourceId;
}

export type Question = string & { readonly brand: "Question" };

export function createQuestion(value: string): Question {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      AnswerErrorCode.EmptyQuestion,
      "Question cannot be empty",
    );
  }
  return value as Question;
}

export type AnswerContent = string & { readonly brand: "AnswerContent" };

export function createAnswerContent(value: string): AnswerContent {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      AnswerErrorCode.EmptyContent,
      "AnswerContent cannot be empty",
    );
  }
  return value as AnswerContent;
}

export type PromptTemplate = string & { readonly brand: "PromptTemplate" };
