import { AppError } from "@/lib/errors";
import { paiseFromRupeeString } from "@/lib/money";

export function resolveContractSplit(params: {
  amountPaise: number;
  contractScope: "MERGED" | "OUT_OF_CONTRACT" | "SPLIT";
  contractIncludedRupees?: string;
}): { includeInContract: boolean; outOfContractAmount: number } {
  if (params.contractScope === "OUT_OF_CONTRACT") {
    return { includeInContract: false, outOfContractAmount: 0 };
  }

  if (params.contractScope === "SPLIT") {
    let included: number;
    try {
      included = paiseFromRupeeString(params.contractIncludedRupees ?? "");
    } catch {
      throw new AppError(
        "VALIDATION",
        "Enter how much of this payment is included in the contract.",
      );
    }
    if (included <= 0 || included >= params.amountPaise) {
      throw new AppError(
        "VALIDATION",
        "The contract portion must be more than zero and less than the full amount.",
      );
    }
    return {
      includeInContract: true,
      outOfContractAmount: params.amountPaise - included,
    };
  }

  return { includeInContract: true, outOfContractAmount: 0 };
}
