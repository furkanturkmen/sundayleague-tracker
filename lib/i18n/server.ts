import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { isLang, makeT, type Lang, type T } from "@/lib/i18n";

export const LANG_COOKIE = "lang";

/** The visitor's language: their own pick (the switch in the footer), else Dutch when the browser asks for it first. */
export const getLang = cache(async (): Promise<Lang> => {
  const picked = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(picked)) return picked;
  const first = ((await headers()).get("accept-language") ?? "").split(",")[0].trim().toLowerCase();
  return first.startsWith("nl") ? "nl" : "en";
});

/** t() for server components and actions, in the visitor's language. */
export async function getT(): Promise<T> {
  return makeT(await getLang());
}
