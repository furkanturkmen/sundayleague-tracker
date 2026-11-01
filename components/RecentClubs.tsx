"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/I18n";
import { Crest } from "@/components/ui";
import { existingClubs } from "@/lib/actions";

const KEY = "recent-clubs";

interface Recent {
  slug: string;
  name: string;
  shortName: string;
  accent: string;
  gold: string;
  logo?: string | null;
}

function read(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Drops the club to the front of this browser's recently viewed list. */
export function RememberClub({ club }: { club: Recent }) {
  useEffect(() => {
    try {
      const list = [club, ...read().filter((c) => c.slug !== club.slug)].slice(0, 4);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // storage blocked - nothing to remember
    }
  }, [club]);
  return null;
}

/** The clubs this browser has opened, newest first. The site lists no clubs itself, so this is the way back in. */
export function RecentClubs() {
  const t = useT();
  const [list, setList] = useState<Recent[] | null>(null);
  useEffect(() => {
    const saved = read();
    if (!saved.length) return setList([]);
    existingClubs(saved.map((c) => c.slug))
      .then((ok) => setList(saved.filter((c) => ok.includes(c.slug))))
      .catch(() => setList(saved));
  }, []);
  if (!list?.length) return null;
  return (
    <section className="section">
      <h2>{t("Your clubs")}</h2>
      <div className="club-grid">
        {list.map((c) => (
          <Link key={c.slug} href={`/c/${c.slug}`} className="club-card" style={{ ["--accent" as string]: c.accent, ["--gold" as string]: c.gold }}>
            <Crest short={c.shortName} logo={c.logo} size={40} />
            <strong>{c.name}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
