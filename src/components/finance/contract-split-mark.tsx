import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  contractAmountPaise,
  outOfContractAmountPaise,
  type ContractSplitRow,
} from "@/server/budget/math";

function compactInr(paise: number): string {
  if (paise % 100 !== 0) return formatInrFromPaise(paise);
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Quiet in-contract / out-of-contract chips.
 * `paper` is for the light receipt. `dark` is for the ledger and dashboard.
 */
export function ContractSplitMark({
  row,
  surface = "dark",
}: {
  row: ContractSplitRow;
  surface?: "dark" | "paper";
}) {
  const outPaise = outOfContractAmountPaise(row);
  if (outPaise <= 0) return null;
  const inPaise = contractAmountPaise(row);
  const paper = surface === "paper";

  if (inPaise <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
          paper
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-amber-300/25 bg-amber-400/10 text-amber-100",
        )}
      >
        Out of contract
      </span>
    );
  }

  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
          paper
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
        )}
      >
        <span className={paper ? "text-emerald-700/70" : "text-emerald-200/70"}>
          In
        </span>
        {compactInr(inPaise)}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
          paper
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-amber-300/25 bg-amber-400/10 text-amber-100",
        )}
      >
        <span className={paper ? "text-amber-800/70" : "text-amber-200/70"}>
          Out
        </span>
        {compactInr(outPaise)}
      </span>
    </span>
  );
}
