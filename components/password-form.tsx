"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { finishRecovery } from "@/app/actions/password";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/** Как при регистрации. */
const MIN_PASSWORD = 8;

type Mode = "recovery" | "change" | "invalid";

export function PasswordForm({
  email,
  mode,
  available,
}: {
  email: string | null;
  mode: Mode;
  available: boolean;
}) {
  const t = useTranslations("password.reset");
  const tf = useTranslations("password.forgot");

  const [current, setCurrent] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setError(tf("unavailable"));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t("short", { min: MIN_PASSWORD }));
      return;
    }
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }

    setPending(true);
    setError(null);

    // Смена без письма: сначала убеждаемся, что пароль знает владелец,
    // а не тот, кто сел за чужой открытый браузер.
    if (mode === "change") {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email ?? "",
        password: current,
      });
      if (authError) {
        setPending(false);
        setError(t("wrongCurrent"));
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPending(false);
      setError(
        updateError.code === "same_password"
          ? t("same")
          : updateError.code === "weak_password"
            ? t("weak")
            : t("failed"),
      );
      return;
    }

    // Пароль мог утечь — выходим на остальных устройствах, здесь остаёмся.
    await supabase.auth.signOut({ scope: "others" });
    await finishRecovery();
    setPending(false);
    setDone(true);
  };

  const title = mode === "change" ? t("titleChange") : t("titleRecovery");
  const subtitle =
    mode === "change" ? t("subtitleChange") : t("subtitleRecovery");

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
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <KeyRound className="size-5" />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
            {mode === "invalid" ? t("noSessionTitle") : title}
          </h1>
          {mode !== "invalid" && (
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <Card className="ms7-surface mt-7 py-6 backdrop-blur-sm">
          <CardContent className="px-6">
            {!available ? (
              <p className="text-sm text-muted-foreground">{tf("unavailable")}</p>
            ) : mode === "invalid" ? (
              <div className="text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("noSessionText")}
                </p>
                <Button asChild size="sm" className="mt-5">
                  <Link href="/forgot-password">{t("requestNew")}</Link>
                </Button>
              </div>
            ) : done ? (
              <div role="status" className="text-center">
                <CheckCircle2
                  aria-hidden
                  className="mx-auto size-8 text-muted-foreground"
                />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {t("doneTitle")}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {t("doneText")}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-5">
                  <Link href="/rating">{t("toSite")}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-4">
                {/* Для менеджеров паролей: к какой учётной записи пароль. */}
                <input
                  type="email"
                  name="username"
                  autoComplete="username"
                  value={email ?? ""}
                  readOnly
                  hidden
                />

                {mode === "change" && (
                  <PasswordField
                    id="pw-current"
                    label={t("current")}
                    autoComplete="current-password"
                    value={current}
                    disabled={pending}
                    onChange={setCurrent}
                  />
                )}
                <PasswordField
                  id="pw-new"
                  label={t("newPassword")}
                  placeholder={t("placeholder", { min: MIN_PASSWORD })}
                  autoComplete="new-password"
                  value={password}
                  disabled={pending}
                  onChange={setPassword}
                />
                <PasswordField
                  id="pw-confirm"
                  label={t("confirm")}
                  autoComplete="new-password"
                  value={confirm}
                  disabled={pending}
                  onChange={setConfirm}
                />

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
      </FadeIn>
    </div>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  placeholder?: string;
  autoComplete: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="password"
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
