"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  email,
  role,
}: {
  email: string | null;
  role: "pending" | "expert" | "admin" | null;
}) {
  const t = useTranslations("common");
  const ta = useTranslations("auth");
  const [pending, startTransition] = React.useTransition();

  if (!email) {
    return (
      <div className="ml-1 flex items-center gap-1">
        {/* На узких экранах прячем: шапка не вмещает обе кнопки.
            Со страницы входа регистрация всё равно доступна ссылкой. */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hidden px-2 text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          <Link href="/register">{t("register")}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/login">{t("login")}</Link>
        </Button>
      </div>
    );
  }

  const roleLabel =
    role === "admin"
      ? ta("roleAdmin")
      : role === "expert"
        ? ta("roleExpert")
        : ta("rolePending");

  const initial = email.trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={ta("signedInAs")}
          className="ml-1"
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
          >
            {initial || <UserRound className="size-3.5" />}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <div className="px-2 py-1.5">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            {ta("signedInAs")}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium">{email}</p>
          {/* Роль показывается всегда: пользователь со статусом «ожидает»
              иначе не понимает, почему кнопка сохранения недоступна. */}
          <p className="mt-1 text-[11px] text-muted-foreground">{roleLabel}</p>
        </div>
        <DropdownMenuSeparator />
        {(role === "expert" || role === "admin") && (
          <DropdownMenuItem asChild className="gap-2">
            <Link href="/my">
              <ClipboardList className="size-4 text-muted-foreground" />
              {ta("myEvaluations")}
            </Link>
          </DropdownMenuItem>
        )}
        {role === "admin" && (
          <DropdownMenuItem asChild className="gap-2">
            <Link href="/admin">
              <ShieldCheck className="size-4 text-muted-foreground" />
              {ta("admin")}
            </Link>
          </DropdownMenuItem>
        )}
        {(role === "expert" || role === "admin") && <DropdownMenuSeparator />}
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            // Иначе меню закроется раньше, чем стартует transition.
            event.preventDefault();
            startTransition(() => {
              void signOut();
            });
          }}
          className="gap-2"
        >
          <LogOut className="size-4 text-muted-foreground" />
          {ta("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
