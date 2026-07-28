import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "./config";

/**
 * Клиент для серверных компонентов и server actions.
 * `null`, если Supabase не настроен — вызывающий код обязан это проверять.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;

  const store = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // В Server Component куки только на чтение. Это штатная ситуация:
          // обновлением сессии занимается proxy.ts.
        }
      },
    },
  });
}
