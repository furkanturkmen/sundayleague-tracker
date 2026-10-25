"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crest } from "@/components/ui";

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

export function RecentClubs({ existing }: { existing: string[] }) {
  const [list, setList] = useState<Recent[]>([]);
  useEffect(() => setList(read().filter((c) => existing.includes(c.slug))), [existing]);
  if (!list.length) return null;
  return (
    <section className="section">
      <h2>Jump back in</h2>
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
