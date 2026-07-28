"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/rating", key: "rating" },
  { href: "/calculator", key: "calculator" },
  { href: "/methodology", key: "methodology" },
] as const;

export function Navbar({ userEmail }: { userEmail: string | null }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 8);
  });

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      data-scrolled={scrolled ? "" : undefined}
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-b border-border bg-card/75 shadow-[0_1px_3px_rgb(15_42_71_/_0.06)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-[13px] font-semibold tracking-tight text-primary-foreground"
          >
            M7
          </span>
          {/* На узких экранах остаётся только знак — иначе меню не помещается. */}
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-semibold tracking-tight text-foreground">
              {t("brand")}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {t("tagline")}
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-0.5 overflow-x-auto lg:gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-2 text-xs font-medium whitespace-nowrap transition-colors lg:px-3 lg:text-sm",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 border-l border-border pl-2 sm:gap-1 sm:pl-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu email={userEmail} />
        </div>
      </div>
    </motion.header>
  );
}
