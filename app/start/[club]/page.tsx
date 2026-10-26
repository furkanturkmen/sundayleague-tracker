import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Welcome, type WelcomeStep } from "@/components/Welcome";
import { loadClub } from "@/lib/club";
import { formatDate } from "@/lib/stats";
import { sameName } from "@/lib/voetbal-parse";

export const metadata: Metadata = { title: "Welcome" };

type Props = { params: Promise<{ club: string }>; searchParams: Promise<{ step?: string }> };

/** The screens right after sign-up: pull in voetbal.nl, pick the squad, then share the link. */
export default async function StartPage({ params, searchParams }: Props) {
  const { club: slug } = await params;
  const { step: asked } = await searchParams;
  const { data, st, admin } = await loadClub(slug);
  if (!admin) redirect(`${st.base}/login?next=${encodeURIComponent(`/start/${slug}`)}`);

  const { club, players } = data;
  const needsSync = Boolean(club.voetbal && !club.voetbal.syncedAt && !club.voetbal.error);
  const step: WelcomeStep = asked === "squad" || asked === "done" ? asked : needsSync ? "sync" : "squad";

  // Everyone in a voetbal.nl line-up who isn't in the squad yet, most games first.
  const counts = new Map<string, number>();
  for (const m of data.matches) for (const n of m.lineup ?? []) if (!players.some((p) => sameName(p.name, n))) counts.set(n, (counts.get(n) ?? 0) + 1);
  const suggestions = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, games]) => ({ name, games }));

  const host = (await headers()).get("host") ?? "";
  const next = st.upcoming[0];

  return (
    <Welcome
      step={step}
      slug={slug}
      club={{ name: club.name, shortName: club.shortName, logo: club.logo, accent: club.accent, gold: club.gold }}
      linked={Boolean(club.voetbal)}
      syncError={club.voetbal?.error ?? null}
      counts={{ matches: data.matches.length, results: st.played.length, table: data.standings.length > 0, squad: players.length }}
      suggestions={suggestions}
      url={`${host}${st.base}`}
      nextMatch={next ? { id: next.id, opponent: next.opponent, date: formatDate(next.date, { weekday: "short", day: "numeric", month: "short" }) } : null}
    />
  );
}
