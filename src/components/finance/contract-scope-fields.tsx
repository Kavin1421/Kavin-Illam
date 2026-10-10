"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInrFromPaise, paiseFromRupeeString } from "@/lib/money";

function paiseOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return paiseFromRupeeString(trimmed);
  } catch {
    return null;
  }
}

export function ContractScopeFields({
  amountRupees,
  defaultScope = "MERGED",
  defaultIncludedRupees = "",
}: {
  amountRupees: string;
  defaultScope?: string;
  defaultIncludedRupees?: string;
}) {
  const [scope, setScope] = useState(defaultScope);
  const [includedRupees, setIncludedRupees] = useState(defaultIncludedRupees);

  const totalPaise = paiseOrNull(amountRupees);
  const includedPaise = paiseOrNull(includedRupees);
  const splitReady =
    scope === "SPLIT" &&
    totalPaise != null &&
    includedPaise != null &&
    includedPaise > 0 &&
    includedPaise < totalPaise;

  return (
    <div className="space-y-2">
      <Label htmlFor="contractScope">Contract</Label>
      <select
        id="contractScope"
        name="contractScope"
        value={scope}
        onChange={(event) => setScope(event.target.value)}
        className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
      >
        <option value="MERGED">Merge into contract</option>
        <option value="SPLIT">Split this payment</option>
        <option value="OUT_OF_CONTRACT">
          Out of contract (do not add to budget)
        </option>
      </select>
      {scope === "SPLIT" ? (
        <div className="space-y-2 pt-1">
          <Label htmlFor="contractIncludedRupees">
            Amount included in contract (₹)
          </Label>
          <Input
            id="contractIncludedRupees"
            name="contractIncludedRupees"
            value={includedRupees}
            onChange={(event) => setIncludedRupees(event.target.value)}
            inputMode="decimal"
            placeholder="50000"
            required
          />
          <p className="text-muted-foreground text-xs">
            {splitReady && totalPaise != null && includedPaise != null
              ? `${formatInrFromPaise(includedPaise)} stays in the contract. ${formatInrFromPaise(totalPaise - includedPaise)} is tracked separately and is not added to the contract budget.`
              : "Enter how much of this payment belongs in the contract. The balance is out of contract."}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          {scope === "OUT_OF_CONTRACT"
            ? "This whole payment is tracked on the dashboard separately and is not added to the contract spend."
            : "The whole payment is added to the contract spend. Choose split to keep only part of it in the contract."}
        </p>
      )}
    </div>
  );
}
