import { BusinessRuleError } from "@/core/domain/error";
import { SharedErrorCode } from "./errorCode";

export type DocumentId = string & { readonly brand: "DocumentId" };

export function createDocumentId(value: string): DocumentId {
  if (!value || value.trim() === "") {
    throw new BusinessRuleError(
      SharedErrorCode.InvalidDocumentId,
      "DocumentId cannot be empty",
    );
  }
  return value as DocumentId;
}
