"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Loader2, Lock, Mail, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 8;

export default function RegisterPage() {
  const t = useTranslations("register");
  const tc = useTranslations("common");

  const supabase = createClient();
  const available = supabase !== null;

  const [fullName, setFullName] = React.useState("");
  const [organization, setOrganization] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<"confirm" | "review" | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName.trim() || !email.trim() || !password) {
      setError(t("invalid"));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t("short", { min: MIN_PASSWORD }));
      return;
    }
    if (!supabase) {
      setError(t("unavailable"));
      return;
    }

    setPending(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Триггер on_auth_user_created переносит это в public.profiles.
        data: {
          full_name: fullName.trim(),
          organization: organization.trim(),
        },
      },
    });

    setPending(false);

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("already")
          ? t("exists")
          : t("failed"),
      );
      return;
    }

    // Если в проекте включено подтверждение почты, сессии ещё нет.
    setDone(data.session ? "review" : "confirm");
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

      <FadeIn className="w-full max-w-md">
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
              <div className="text-center">
                <CheckCircle2
                  aria-hidden
                  className="mx-auto size-8 text-muted-foreground"
                />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {t("doneTitle")}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {done === "confirm" ? t("doneConfirm") : t("doneReview")}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-5">
                  <Link href="/login">{t("toLogin")}</Link>
                </Button>
              </div>
            ) : (
              <>
                <form onSubmit={submit} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name">{t("fullName")}</Label>
                    <div className="relative">
                      <User
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="reg-name"
                        autoComplete="name"
                        placeholder={t("fullNamePlaceholder")}
                        value={fullName}
                        disabled={pending}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-org">{t("organization")}</Label>
                    <div className="relative">
                      <Building2
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="reg-org"
                        autoComplete="organization"
                        placeholder={t("organizationPlaceholder")}
                        value={organization}
                        disabled={pending}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email">{t("email")}</Label>
                    <div className="relative">
                      <Mail
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="reg-email"
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
                    <Label htmlFor="reg-password">{t("password")}</Label>
                    <div className="relative">
                      <Lock
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="reg-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("passwordPlaceholder", {
                          min: MIN_PASSWORD,
                        })}
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
                    disabled={pending || !available}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    {pending ? t("submitting") : t("submit")}
                  </Button>
                </form>

                <p className="mt-4 border-t border-border pt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                  {available ? t("moderationNote") : t("unavailable")}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
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
          <Link
            href="/login"
            className="text-xs font-medium text-foreground underline underline-offset-4"
          >
            {t("haveAccount")}
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          {tc("brand")} — {tc("tagline")}
        </p>
      </FadeIn>
    </div>
  );
}
