"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertBudgetAction,
  type BudgetActionState,
} from "@/server/budget/actions";

const initialState: BudgetActionState = {};

type CategoryOption = { id: string; name: string; code: string };

type EditableLine = {
  key: string;
  categoryId: string;
  label: string;
  plannedAmountRupees: string;
};

function paiseToRupeeInput(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const frac = Math.abs(paise % 100)
    .toString()
    .padStart(2, "0");
  return frac === "00" ? String(whole) : `${whole}.${frac}`;
}

export function BudgetEditorForm({
  slug,
  categories,
  initial,
}: {
  slug: string;
  categories: CategoryOption[];
  initial?: {
    name: string;
    notes: string;
    totalPlannedRupees: string;
    defaultRemainingMode: "VS_PAID" | "VS_COMMITTED";
    lines: EditableLine[];
  };
}) {
  const action = upsertBudgetAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [lines, setLines] = useState<EditableLine[]>(
    initial?.lines?.length
      ? initial.lines
      : [
          {
            key: "1",
            categoryId: "",
            label: "",
            plannedAmountRupees: "",
          },
        ],
  );

  const linesJson = useMemo(() => JSON.stringify(lines), [lines]);

  function updateLine(key: string, patch: Partial<EditableLine>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (patch.categoryId !== undefined) {
          const cat = categories.find((c) => c.id === patch.categoryId);
          if (cat && !patch.label) {
            next.label = cat.name;
          }
        }
        return next;
      }),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Budget name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? "Project budget"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultRemainingMode">Default remaining mode</Label>
          <select
            id="defaultRemainingMode"
            name="defaultRemainingMode"
            defaultValue={initial?.defaultRemainingMode ?? "VS_PAID"}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="VS_PAID">Budget − paid</option>
            <option value="VS_COMMITTED">Budget − committed</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalPlannedRupees">
            Total planned override (₹, optional)
          </Label>
          <Input
            id="totalPlannedRupees"
            name="totalPlannedRupees"
            defaultValue={initial?.totalPlannedRupees ?? ""}
            placeholder="Leave blank to sum lines"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">Category lines</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  key: String(Date.now()),
                  categoryId: "",
                  label: "",
                  plannedAmountRupees: "",
                },
              ])
            }
          >
            Add line
          </Button>
        </div>

        {lines.map((line) => (
          <div
            key={line.key}
            className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-3"
          >
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={line.categoryId}
                onChange={(e) =>
                  updateLine(line.key, { categoryId: e.target.value })
                }
                className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
              >
                <option value="">Custom / uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={line.label}
                onChange={(e) =>
                  updateLine(line.key, { label: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Planned (₹)</Label>
              <div className="flex gap-2">
                <Input
                  value={line.plannedAmountRupees}
                  onChange={(e) =>
                    updateLine(line.key, {
                      plannedAmountRupees: e.target.value,
                    })
                  }
                  inputMode="decimal"
                  required
                />
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setLines((prev) => prev.filter((l) => l.key !== line.key))
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <input type="hidden" name="linesJson" value={linesJson} />

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save budget"}
      </Button>
    </form>
  );
}

export { paiseToRupeeInput };
