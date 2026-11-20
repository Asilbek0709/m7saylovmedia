"use client";

import * as React from "react";
import { Check, Loader2, Lock, LockOpen, Pencil, Plus, X } from "lucide-react";

import {
  createPeriod,
  setPeriodStatus,
  updatePeriod,
  type PeriodInput,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface PeriodRow {
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  status: "open" | "closed";
  evaluations: number;
}

export interface PeriodsManagerLabels {
  name: string;
  namePlaceholder: string;
  startsOn: string;
  endsOn: string;
  create: string;
  created: string;
  status: string;
  open: string;
  closed: string;
  evaluations: string;
  dates: string;
  close: string;
  reopen: string;
  closeConfirm: string;
  edit: string;
  save: string;
  cancel: string;
  renameHint: string;
  empty: string;
  errors: Record<string, string>;
}

const EMPTY: PeriodInput = { name: "", startsOn: "", endsOn: "" };

export function PeriodsManager({
  periods,
  labels,
}: {
  periods: PeriodRow[];
  labels: PeriodsManagerLabels;
}) {
  const [draft, setDraft] = React.useState<PeriodInput>(EMPTY);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [edit, setEdit] = React.useState<PeriodInput>(EMPTY);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const fail = (reason: string) =>
    setMessage({ kind: "error", text: labels.errors[reason] ?? labels.errors.failed });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("__new");
    setMessage(null);
    const result = await createPeriod(draft);
    setBusy(null);
    if (result.ok) {
      setMessage({ kind: "ok", text: `${labels.created} · ${draft.name.trim()}` });
      setDraft(EMPTY);
    } else fail(result.reason);
  };

  const toggle = async (period: PeriodRow) => {
    const next = period.status === "open" ? "closed" : "open";
    if (next === "closed" && !window.confirm(labels.closeConfirm.replace("{name}", period.name))) {
      return;
    }
    setBusy(period.name);
    setMessage(null);
    const result = await setPeriodStatus(period.name, next);
    setBusy(null);
    if (!result.ok) fail(result.reason);
  };

  const startEdit = (period: PeriodRow) => {
    setMessage(null);
    setEditing(period.name);
    setEdit({
      name: period.name,
      startsOn: period.startsOn ?? "",
      endsOn: period.endsOn ?? "",
    });
  };

  const save = async () => {
    if (!editing) return;
    setBusy(editing);
    setMessage(null);
    const result = await updatePeriod(editing, edit);
    setBusy(null);
    if (result.ok) setEditing(null);
    else fail(result.reason);
  };

  const dates = (p: { startsOn: string | null; endsOn: string | null }) =>
    p.startsOn || p.endsOn ? `${p.startsOn ?? "…"} — ${p.endsOn ?? "…"}` : "—";

  return (
    <div className="space-y-5">
      <form
        onSubmit={submit}
        className="grid gap-3 px-6 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="period-name" className="text-xs">
            {labels.name}
          </Label>
          <Input
            id="period-name"
            value={draft.name}
            disabled={busy !== null}
            placeholder={labels.namePlaceholder}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="period-start" className="text-xs">
            {labels.startsOn}
          </Label>
          <Input
            id="period-start"
            type="date"
            value={draft.startsOn}
            disabled={busy !== null}
            onChange={(e) => setDraft({ ...draft, startsOn: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="period-end" className="text-xs">
            {labels.endsOn}
          </Label>
          <Input
            id="period-end"
            type="date"
            min={draft.startsOn || undefined}
            value={draft.endsOn}
            disabled={busy !== null}
            onChange={(e) => setDraft({ ...draft, endsOn: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={busy !== null || !draft.name.trim()}>
          {busy === "__new" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          {labels.create}
        </Button>
      </form>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "px-6 text-sm text-destructive"
              : "px-6 text-sm text-foreground"
          }
        >
          {message.text}
        </p>
      )}

      {periods.length === 0 ? (
        <p className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-56 pl-6">{labels.name}</TableHead>
                <TableHead className="min-w-56">{labels.dates}</TableHead>
                <TableHead className="w-28">{labels.status}</TableHead>
                <TableHead className="w-24 text-center">{labels.evaluations}</TableHead>
                <TableHead className="w-40 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
              {periods.map((p) =>
                editing === p.name ? (
                  <TableRow key={p.name}>
                    <TableCell className="pl-6 align-top">
                      <Input
                        aria-label={labels.name}
                        value={edit.name}
                        disabled={busy !== null}
                        onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                        className="h-8 text-sm"
                      />
                      {p.evaluations > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {labels.renameHint}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex gap-1.5">
                        <Input
                          type="date"
                          aria-label={labels.startsOn}
                          value={edit.startsOn}
                          disabled={busy !== null}
                          onChange={(e) => setEdit({ ...edit, startsOn: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <Input
                          type="date"
                          aria-label={labels.endsOn}
                          min={edit.startsOn || undefined}
                          value={edit.endsOn}
                          disabled={busy !== null}
                          onChange={(e) => setEdit({ ...edit, endsOn: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge status={p.status} labels={labels} />
                    </TableCell>
                    <TableCell className="text-center align-top text-sm tabular">
                      {p.evaluations}
                    </TableCell>
                    <TableCell className="pr-6 text-right align-top whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={labels.save}
                        title={labels.save}
                        disabled={busy !== null || !edit.name.trim()}
                        onClick={save}
                        className="size-8"
                      >
                        {busy === p.name ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={labels.cancel}
                        title={labels.cancel}
                        disabled={busy !== null}
                        onClick={() => setEditing(null)}
                        className="size-8"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={p.name}>
                    <TableCell className="pl-6 text-sm font-medium text-foreground">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground tabular">
                      {dates(p)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} labels={labels} />
                    </TableCell>
                    <TableCell className="text-center text-sm tabular">
                      {p.evaluations}
                    </TableCell>
                    <TableCell className="pr-6 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={labels.edit}
                        title={labels.edit}
                        disabled={busy !== null || editing !== null}
                        onClick={() => startEdit(p)}
                        className="size-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy !== null || editing !== null}
                        onClick={() => toggle(p)}
                        className="h-8"
                      >
                        {busy === p.name ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : p.status === "open" ? (
                          <Lock className="size-3.5" />
                        ) : (
                          <LockOpen className="size-3.5" />
                        )}
                        {p.status === "open" ? labels.close : labels.reopen}
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  labels,
}: {
  status: "open" | "closed";
  labels: PeriodsManagerLabels;
}) {
  return status === "open" ? (
    <Badge variant="outline" className="font-normal">
      {labels.open}
    </Badge>
  ) : (
    <Badge variant="secondary" className="font-normal">
      <Lock aria-hidden className="size-3" />
      {labels.closed}
    </Badge>
  );
}
