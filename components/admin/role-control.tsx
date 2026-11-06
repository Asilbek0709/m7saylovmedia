"use client";

import * as React from "react";
import { Check, KeyRound, Loader2 } from "lucide-react";

import { sendPasswordReset, setUserRole } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/lib/auth";

const ROLES: UserRole[] = ["pending", "expert", "admin"];

export interface RoleControlLabels {
  roles: Record<UserRole, string>;
  approve: string;
  saved: string;
  sendReset: string;
  sendResetShort: string;
  resetSent: string;
  errors: Record<string, string>;
}

/** Роль пользователя; у заявки — ещё и кнопка «Подтвердить» в один клик. */
export function RoleControl({
  userId,
  role,
  labels,
}: {
  userId: string;
  role: UserRole;
  labels: RoleControlLabels;
}) {
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const reset = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await sendPasswordReset(userId);
      setMessage(
        result.ok
          ? { kind: "ok", text: labels.resetSent }
          : { kind: "error", text: labels.errors[result.reason] },
      );
    });

  const apply = (next: UserRole) =>
    startTransition(async () => {
      setMessage(null);
      const result = await setUserRole(userId, next);
      setMessage(
        result.ok
          ? { kind: "ok", text: labels.saved }
          : { kind: "error", text: labels.errors[result.reason] },
      );
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={role}
        disabled={pending}
        onValueChange={(v) => apply(v as UserRole)}
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {labels.roles[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {role === "pending" && (
        <Button size="sm" disabled={pending} onClick={() => apply("expert")}>
          {labels.approve}
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={reset}
        title={labels.sendReset}
        className="text-muted-foreground"
      >
        <KeyRound className="size-3.5" />
        {labels.sendResetShort}
      </Button>

      {pending && (
        <Loader2 aria-hidden className="size-3.5 animate-spin text-muted-foreground" />
      )}
      {message && (
        <span
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "text-xs text-destructive"
              : "flex items-center gap-1 text-xs text-muted-foreground"
          }
        >
          {message.kind === "ok" && <Check aria-hidden className="size-3" />}
          {message.text}
        </span>
      )}
    </div>
  );
}
