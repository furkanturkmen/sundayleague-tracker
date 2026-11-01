"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useTransition, type ReactNode } from "react";
import { LANGS, makeT, type Lang, type T } from "@/lib/i18n";
import { setLang } from "@/lib/i18n/actions";

const LangContext = createContext<Lang>("en");

/** Hands the server's pick of language to client components. Set once, in the root layout. */
export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** t() for client components. */
export function useT(): T {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}

/** EN | NL in the footer. Saves the pick, then redraws the page in it. */
export function LangSwitch() {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <span className="lang-switch" role="group" aria-label="Language / Taal">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className="btn-link"
          aria-pressed={l === lang}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setLang(l);
              router.refresh();
            })
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}
