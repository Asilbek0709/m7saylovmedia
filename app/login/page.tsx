"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // В демо-режиме клиента нет — форма показывает пояснение и не отправляется.
  const supabase = createClient();
  const authAvailable = supabase !== null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError(t("invalid"));
      return;
    }
    if (!supabase) {
      setError(t("unavailable"));
      return;
    }

    setPending(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setPending(false);
      setError(t("failed"));
      return;
    }

    const next =
      new URLSearchParams(window.location.search).get("next") ?? "/rating";
    router.push(next);
    // Сессия живёт в куках, а навбар рисуется на сервере — без refresh он
    // остался бы в состоянии «не вошёл».
    router.refresh();
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_15%,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(55%_45%_at_50%_25%,#000,transparent)]"
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
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Card className="ms7-surface mt-7 py-6 backdrop-blur-sm">
          <CardContent className="px-6">
            <form onSubmit={submit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("email")}</Label>
                <div className="relative">
                  <Mail
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    disabled={pending}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("password")}</Label>
                  <span className="text-xs text-muted-foreground">
                    {t("forgot")}
                  </span>
                </div>
                <div className="relative">
                  <Lock
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={t("passwordPlaceholder")}
                    value={password}
                    disabled={pending}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={pending || !authAvailable}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {pending ? t("submitting") : t("submit")}
              </Button>
            </form>

            {!authAvailable && (
              <p className="mt-4 border-t border-border pt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                {t("demoNote")}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <Link href="/">
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          {tc("brand")} — {tc("tagline")}
        </p>
      </FadeIn>
    </div>
  );
}
