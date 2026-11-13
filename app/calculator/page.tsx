import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CalculatorPanel } from "@/components/calculator-panel";
import { canWrite, getCurrentUser } from "@/lib/auth";
import { getOwnEvaluation } from "@/lib/evaluation-records";
import { getOutletDirectory, getRankings } from "@/lib/rankings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getWeightHistory } from "@/lib/weights";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calculator");
  return { title: t("eyebrow"), description: t("subtitle") };
}


export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ rows, period, live }, weightHistory, directory] = await Promise.all([
    getRankings(50),
    getWeightHistory(),
    getOutletDirectory(),
  ]);
  const user = isSupabaseConfigured ? await getCurrentUser() : null;

  // ?edit=<id> — правка своей оценки из «Моих оценок».
  const editParam = (await searchParams).edit;
  const editId = Array.isArray(editParam) ? editParam[0] : editParam;
  const editing =
    editId && user && canWrite(user) ? await getOwnEvaluation(user, editId) : null;


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
      // При подключённой базе демо-издания в поиск не попадают: их выбор
      // сохранял бы оценку в издание-дубль рядом с настоящим из справочника.
      rows={live || !isSupabaseConfigured ? rows : []}
      canSave={canSave}
      saveHint={saveHint}
      defaultPeriod={period}
      weights={weightHistory.active.weights}
      directory={directory}
      editing={
        editing && {
          id: editing.id,
          outletId: editing.outletId,
          outletName: editing.outletName,
          period: editing.period,
          scores: editing.scores,
          indicators: editing.indicators,
        }
      }
      editNotFound={Boolean(editId) && !editing}
    />
  );
}
