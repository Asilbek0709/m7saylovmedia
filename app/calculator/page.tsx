import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CalculatorPanel } from "@/components/calculator-panel";
import { canWrite, getCurrentUser } from "@/lib/auth";
import { getRankings } from "@/lib/rankings";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calculator");
  return { title: t("eyebrow"), description: t("subtitle") };
}


export default async function CalculatorPage() {
  const { rows, period } = await getRankings(50);
  const user = isSupabaseConfigured ? await getCurrentUser() : null;


  const canSave = canWrite(user);
  const saveHint = canSave
    ? null
    : !isSupabaseConfigured
      ? "demo"
      : user === null
        ? "signin"
        : "pending";

  return (
    <CalculatorPanel
      rows={rows}
      canSave={canSave}
      saveHint={saveHint}
      defaultPeriod={period}
    />
  );
}
