"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "./config";

let cached: SupabaseClient | null = null;

/**
 * Клиент для браузера. `null` в демо-режиме — форма входа обязана это
 * проверять и показывать соответствующее сообщение, а не падать.
 */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  cached ??= createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  return cached;
}
