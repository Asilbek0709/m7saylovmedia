"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  // Навбар рисуется в layout и кешируется — без сброса пользователь
  // остался бы «вошедшим» до полной перезагрузки.
  revalidatePath("/", "layout");
  redirect("/");
}
