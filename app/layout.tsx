import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { HTML_LANG, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

// Кириллица обязательна: узбекский интерфейс методики набран кириллицей.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  const landing = await getTranslations("landing");

  return {
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
    // suppressHydrationWarning — next-themes дописывает класс темы до гидратации.
    <html
      lang={HTML_LANG[locale]}
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Navbar
              userEmail={user?.email ?? null}
              userRole={user?.role ?? null}
            />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border bg-card">
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
