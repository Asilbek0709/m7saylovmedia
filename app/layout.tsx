import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { ScrollProgress } from "@/components/motion/scroll-progress";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { HTML_LANG, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

/** Нарезки Inter, нужные на первом экране: узбекская кириллица и латиница. */
const PRELOADED_FONTS = ["inter-cyrillic", "inter-latin"];

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
    
    <html
      lang={HTML_LANG[locale]}
      className="h-full antialiased"
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
