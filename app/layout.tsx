import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { ScrollProgress } from "@/components/motion/scroll-progress";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { HTML_LANG, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

/**
 * Шрифт заголовков. Onest — один из немногих, где есть и ʻ/ʼ узбекской
 * латиницы, и Ў Қ Ғ Ҳ кириллицы. next/font скачивает его при сборке и
 * раздаёт с нашего домена — без запросов к Google у посетителя.
 */
const display = Onest({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

/** Нарезки Inter, нужные на первом экране: узбекская кириллица и латиница. */
const PRELOADED_FONTS = ["inter-cyrillic", "inter-latin"];

/** Цвет панели браузера и системной строки на телефоне. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f2a47" },
    { media: "(prefers-color-scheme: dark)", color: "#080e1a" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  const landing = await getTranslations("landing");

  return {
    // Абсолютные адреса картинок-превью (og:image) — от основного домена.
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.m7saylovmedia.uz",
    ),
    openGraph: { siteName: t("brand"), type: "website" },
    twitter: { card: "summary_large_image" },
    title: {
      default: `${t("brand")} — ${t("tagline")}`,
      template: `%s · ${t("brand")}`,
    },
    description: landing("subtitle"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const t = await getTranslations("common");
  const user = await getCurrentUser();

  return (
    
    <html
      lang={HTML_LANG[locale]}
      className={`h-full antialiased ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        {PRELOADED_FONTS.map((font) => (
          <link
            key={font}
            rel="preload"
            href={`/fonts/${font}.woff2`}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body className="flex min-h-full flex-col bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ScrollProgress />
            <Navbar
              userEmail={user?.email ?? null}
              userRole={user?.role ?? null}
            />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border bg-card print:hidden">
              <div className="mx-auto w-full max-w-7xl px-4 py-6 text-xs leading-relaxed text-muted-foreground sm:px-6">
                <p className="font-medium text-foreground">
                  {t("brand")} — {t("tagline")}
                </p>
                <p className="mt-1">{t("footer")}</p>
              </div>
            </footer>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
