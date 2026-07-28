"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { setLocale } from "@/app/actions/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const choose = (locale: Locale) => {
    if (locale === active) return;
    startTransition(async () => {
      await setLocale(locale);
      // Сообщения приходят с сервера, поэтому перерисовку запускает refresh.
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("language")}
          disabled={pending}
          className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        >
          <Languages className="size-4" />
          <span className="text-xs font-semibold tracking-wide">
            {LOCALE_LABELS[active].short}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => choose(locale)}
            className="gap-2"
          >
            <span className="w-6 text-[11px] font-semibold text-muted-foreground">
              {LOCALE_LABELS[locale].short}
            </span>
            <span className="flex-1">{LOCALE_LABELS[locale].native}</span>
            {locale === active && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
