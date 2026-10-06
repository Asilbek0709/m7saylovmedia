"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { addWeightSet } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CriterionId } from "@/lib/ms7";

export interface WeightSetFormLabels {
  validFrom: string;
  dateHint: string;
  note: string;
  notePlaceholder: string;
  sum: string;
  sumError: string;
  submit: string;
  success: string;
  errors: Record<string, string>;
}

/** Форма новой версии весов: сумма проверяется на лету, итог — сервером и базой. */
export function WeightSetForm({
  criteria,
  initial,
  minDate,
  labels,
}: {
  criteria: { id: CriterionId; code: string; name: string }[];
  initial: Record<CriterionId, number>;
  minDate: string;
  labels: WeightSetFormLabels;
}) {
  const [weights, setWeights] = React.useState(() =>
    Object.fromEntries(
      criteria.map((c) => [c.id, initial[c.id].toFixed(3)]),
    ) as Record<CriterionId, string>,
  );
  const [validFrom, setValidFrom] = React.useState(minDate);
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  // Сумма в тысячных — без ошибок плавающей точки.
  const sumThousandths = criteria.reduce(
    (s, c) => s + Math.round((Number(weights[c.id]) || 0) * 1000),
    0,
  );
  const sumOk = sumThousandths === 1000;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sumOk) return;
    startTransition(async () => {
      setMessage(null);
      const result = await addWeightSet({
        validFrom,
        note,
        weights: Object.fromEntries(
          criteria.map((c) => [c.id, Number(weights[c.id])]),
        ) as Record<CriterionId, number>,
      });
      setMessage(
        result.ok
          ? { kind: "ok", text: labels.success }
          : { kind: "error", text: labels.errors[result.reason] },
      );
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {criteria.map((c) => (
          <div key={c.id} className="space-y-1.5">
            <Label htmlFor={`w-${c.id}`} className="text-xs" title={c.name}>
              {c.code}
            </Label>
            <Input
              id={`w-${c.id}`}
              type="number"
              inputMode="decimal"
              min={0}
              max={1}
              step={0.001}
              value={weights[c.id]}
              disabled={pending}
              onChange={(e) =>
                setWeights((prev) => ({ ...prev, [c.id]: e.target.value }))
              }
              className="h-8 text-sm tabular"
            />
          </div>
        ))}
      </div>

      <p
        className={
          sumOk
            ? "text-xs text-muted-foreground tabular"
            : "text-xs font-medium text-destructive tabular"
        }
      >
        {labels.sum.replace("{sum}", (sumThousandths / 1000).toFixed(3))}
        {!sumOk && ` — ${labels.sumError}`}
      </p>

      <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label htmlFor="w-valid-from" className="text-xs">
            {labels.validFrom}
          </Label>
          <Input
            id="w-valid-from"
            type="date"
            min={minDate}
            value={validFrom}
            disabled={pending}
            onChange={(e) => setValidFrom(e.target.value)}
            className="h-8 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">{labels.dateHint}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-note" className="text-xs">
            {labels.note}
          </Label>
          <Input
            id="w-note"
            value={note}
            disabled={pending}
            placeholder={labels.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "text-sm text-destructive"
              : "text-sm text-foreground"
          }
        >
          {message.text}
        </p>
      )}

      <Button type="submit" size="sm" disabled={pending || !sumOk}>
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        {labels.submit}
      </Button>
    </form>
  );
}
