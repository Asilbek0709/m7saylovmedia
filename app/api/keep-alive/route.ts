import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/config";

/**
 * Пульс для бесплатного проекта Supabase: без запросов к базе неделю он
 * уходит в паузу, и сайт перестаёт работать до ручного запуска.
 *
 * Vercel Cron (vercel.json) вызывает этот адрес раз в день. Запрос —
 * настоящий SELECT к базе, только чтение публичной таблицы. Если в Vercel
 * задан CRON_SECRET, Vercel сам подставит его в заголовок, и чужие вызовы
 * получат 401.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, reason: "not-configured" }, { status: 503 });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const started = Date.now();
  const { count, error } = await supabase
    .from("media_outlets")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[MS-7] keep-alive: база не ответила:", error.message);
    return NextResponse.json({ ok: false, reason: error.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    outlets: count ?? 0,
    ms: Date.now() - started,
    at: new Date().toISOString(),
  });
}
