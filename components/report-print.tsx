"use client";

import * as React from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Протокол печатается всегда светлым. Тему снимаем на время печати —
 * и с кнопки, и по Ctrl+P: оба пути дают событие beforeprint. Выбор
 * пользователя не трогаем: next-themes и localStorage остаются как были.
 */
function usePrintInLightTheme() {
  React.useEffect(() => {
    const html = document.documentElement;
    let restore: (() => void) | null = null;

    const before = () => {
      if (!html.classList.contains("dark")) return;
      const colorScheme = html.style.colorScheme;
      html.classList.remove("dark");
      html.style.colorScheme = "light";
      restore = () => {
        html.classList.add("dark");
        html.style.colorScheme = colorScheme;
      };
    };
    const after = () => {
      restore?.();
      restore = null;
    };

    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      after();
    };
  }, []);
}

export function PrintButton({ label }: { label: string }) {
  usePrintInLightTheme();

  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
