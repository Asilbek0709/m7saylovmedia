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
      const { data } = await supabase
        .from("media_outlets")
        .select("id, name, website, ownership, region, evaluations(count)")
        .order("name");

      outlets = (data ?? []).map((row) => {
        const counts = row.evaluations as unknown as { count: number }[] | null;
        return {
          id: row.id as string,
          name: row.name as string,
          website: (row.website as string | null) ?? null,
          ownership: row.ownership === "davlat" ? "davlat" : "nodavlat",
          region: (row.region as string) ?? "",
          evaluations: counts?.[0]?.count ?? 0,
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
