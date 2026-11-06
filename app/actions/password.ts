"use server";

import { cookies } from "next/headers";

import { RECOVERY_COOKIE } from "@/lib/safe-next";

/** После смены пароля ссылка из письма своё отработала — снимаем разрешение. */
export async function finishRecovery(): Promise<void> {
  (await cookies()).delete(RECOVERY_COOKIE);
}
