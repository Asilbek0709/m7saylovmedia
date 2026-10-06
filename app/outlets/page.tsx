import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OutletsManager, type OutletRow } from "@/components/outlets-manager";
import { canWrite, getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("outlets");
  return { title: t("eyebrow"), description: t("subtitle") };
}


export default async function OutletsPage() {
  const supabase = await createClient();
  const user = isSupabaseConfigured ? await getCurrentUser() : null;

  let outlets: OutletRow[] = [];

  if (supabase) {
    try {
      // Число туров берётся из публичных итогов: сами оценки экспертов
      // закрыты (007-experts.sql), и прямой подсчёт дал бы анониму 0.
      const [{ data }, { data: rounds }] = await Promise.all([
        supabase
          .from("media_outlets")
          .select("id, name, website, ownership, region")
          .order("name"),
        supabase.from("media_dynamics").select("outlet_id"),
      ]);

      const roundsByOutlet = new Map<string, number>();
      for (const round of rounds ?? []) {
        const id = round.outlet_id as string;
        roundsByOutlet.set(id, (roundsByOutlet.get(id) ?? 0) + 1);
      }

      outlets = (data ?? []).map((row) => {
        return {
          id: row.id as string,
          name: row.name as string,
          website: (row.website as string | null) ?? null,
          ownership: row.ownership === "davlat" ? "davlat" : "nodavlat",
          region: (row.region as string) ?? "",
          evaluations: roundsByOutlet.get(row.id as string) ?? 0,
        };
      });
    } catch {

    }
  }

  const canManage = canWrite(user);
  const hint = canManage
    ? null
    : !isSupabaseConfigured
      ? "demo"
      : user === null
        ? "signin"
        : "pending";

  return (
    <OutletsManager outlets={outlets} canManage={canManage} hint={hint} />
  );
}
