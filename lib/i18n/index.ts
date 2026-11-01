// English or Dutch. The English text in the code is the key; the Dutch dictionaries map it to Dutch, and anything
// they don't have yet stays English. Placeholders like {n} are filled in after the lookup, so the key keeps them.
// The Instagram graphics are always Dutch and don't go through this.
import { NL_COMMON } from "./nl-common";
import { NL_MATCHES } from "./nl-matches";
import { NL_MESSAGES } from "./nl-messages";
import { NL_PLAYERS } from "./nl-players";
import { NL_SETTINGS } from "./nl-settings";

export type Lang = "en" | "nl";
export const LANGS: Lang[] = ["en", "nl"];
export const isLang = (v: unknown): v is Lang => v === "en" || v === "nl";

const NL: Record<string, string> = { ...NL_COMMON, ...NL_MATCHES, ...NL_PLAYERS, ...NL_SETTINGS, ...NL_MESSAGES };

export type Vars = Record<string, string | number>;
/** Translates English text: t("{n} matches", { n: 3 }). */
export type T = (text: string, vars?: Vars) => string;

export function translate(lang: Lang, text: string, vars?: Vars): string {
  const s = lang === "nl" ? (NL[text] ?? text) : text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

export const makeT =
  (lang: Lang): T =>
  (text, vars) =>
    translate(lang, text, vars);

/** For toLocaleDateString and friends. */
export const dateLocale = (lang: Lang) => (lang === "nl" ? "nl-NL" : "en-GB");
