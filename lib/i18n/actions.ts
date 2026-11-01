"use server";

import { cookies } from "next/headers";
import { isLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/i18n/server";

/** The footer switch: remembers the pick for a year. */
export async function setLang(lang: string): Promise<void> {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
