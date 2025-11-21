import { BusinessRuleError } from "@/core/domain/error";
import { SharedErrorCode } from "./errorCode";

export type SimilarityScore = number & { readonly brand: "SimilarityScore" };

export function createSimilarityScore(value: number): SimilarityScore {
  if (value < 0 || value > 1) {
    throw new BusinessRuleError(
      SharedErrorCode.InvalidSimilarityScore,
      "SimilarityScore must be between 0 and 1",
    );
  }
  return value as SimilarityScore;
}
