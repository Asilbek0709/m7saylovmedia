"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
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

export function UserMenu({ email }: { email: string | null }) {
  const t = useTranslations("common");
  const ta = useTranslations("auth");
  const [pending, startTransition] = React.useTransition();

  if (!email) {
    return (
      <Button asChild size="sm" className="ml-1 hidden sm:inline-flex">
        <Link href="/login">{t("login")}</Link>
      </Button>
    );
  }

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
        </div>
        <DropdownMenuSeparator />
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
