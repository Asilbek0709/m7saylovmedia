"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const t = useTranslations("password.forgot");

  const supabase = createClient();
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError(t("invalid"));
      return;
    }
    if (!supabase) {
      setError(t("unavailable"));
      return;
    }

    setPending(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        // Для шаблона письма по умолчанию ({{ .ConfirmationURL }}).
        // Шаблон с {{ .TokenHash }} ведёт на /auth/callback сам.
        redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
      },
    );

    setPending(false);

    // Ответ одинаковый для любого адреса: по форме нельзя проверить,
    // зарегистрирован ли человек. Отдельно — только превышение лимита.
    if (resetError?.status === 429) {
      setError(t("tooMany"));
      return;
    }
    setDone(true);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_15%,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_72%)]"
      />

      <FadeIn className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold tracking-tight text-primary-foreground"
          >
            M7
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Card className="ms7-surface mt-7 py-6 backdrop-blur-sm">
          <CardContent className="px-6">
            {done ? (
              <div role="status" className="text-center">
                <MailCheck
                  aria-hidden
                  className="mx-auto size-8 text-muted-foreground"
                />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {t("doneTitle")}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {t("doneText")}
                </p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">{t("email")}</Label>
                  <div className="relative">
                    <Mail
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.uz"
                      value={email}
                      disabled={pending}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {pending ? t("submitting") : t("submit")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mx-auto mt-5 flex w-fit text-muted-foreground"
        >
          <Link href="/login">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </FadeIn>
    </div>
  );
}
