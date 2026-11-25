"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import {
  BookOpen,
  Calculator,
  ChartColumn,
  Library,
  Menu,
  Newspaper,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo-mark";

const NAV: readonly { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/rating", key: "rating", icon: ChartColumn },
  { href: "/calculator", key: "calculator", icon: Calculator },
  { href: "/outlets", key: "outlets", icon: Newspaper },
  { href: "/methodology", key: "methodology", icon: BookOpen },
  { href: "/glossary", key: "glossary", icon: Library },
  { href: "/authors", key: "authors", icon: Users },
];

export function Navbar({
  userEmail,
  userRole,
}: {
  userEmail: string | null;
  userRole: "pending" | "expert" | "lead" | "admin" | null;
}) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  // Мобильное меню (уже md): открыто ли и для какой страницы.
  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const menuOpen = menuFor === pathname;
  const headerRef = React.useRef<HTMLElement>(null);

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 8);
  });

  // Закрываем по Esc и по нажатию мимо шапки. Переход на другую
  // страницу закрывает меню сам: оно открыто только для своего pathname.
  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuFor(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenuFor(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      data-scrolled={scrolled ? "" : undefined}
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 print:hidden",
        menuOpen
          ? "border-b border-border bg-card"
          : scrolled
            ? "border-b border-border bg-card/75 shadow-[0_1px_3px_rgb(15_42_71_/_0.06)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <LogoMark className="size-9" />
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

        {/* flex-1 + min-w-0: меню забирает остаток строки и прокручивается
            внутри себя. Без min-w-0 flex-элемент не сжимается меньше своего
            содержимого, и на узких экранах вбок едет вся страница. */}
        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto md:flex lg:gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-2 py-2 text-xs font-medium whitespace-nowrap transition-colors lg:px-3 lg:text-sm",
                  active
                    ? "bg-secondary text-secondary-foreground after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-gold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 md:ml-0 md:border-l md:border-border md:pl-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu email={userEmail} role={userRole} />
          <button
            type="button"
            onClick={() => setMenuFor(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? t("closeMenu") : t("menu")}
            className="ml-0.5 flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted md:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-nav"
            aria-label={t("menu")}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full border-b border-border bg-card px-4 pt-2 pb-4 shadow-[0_8px_24px_rgb(15_42_71_/_0.12)] md:hidden"
          >
            <ul className="grid gap-1">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMenuFor(null)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                        active
                          ? "bg-secondary text-secondary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon aria-hidden className="size-5 text-muted-foreground" />
                      {t(`nav.${item.key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
