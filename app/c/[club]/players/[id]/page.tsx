import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { Kit } from "@/components/Kit";
import { Crest, TeamLogo } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { brighten } from "@/lib/color";
import stadium from "@/public/images/stadium-night.jpg";
import { POSITION_NAMES, positionGroup } from "@/lib/types";
import { formatDate, seasonLabel, statsFor } from "@/lib/stats";

type Props = { params: Promise<{ club: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { club, id } = await params;
  const { st } = await loadClub(club);
  return { title: st.getPlayer(id)?.name ?? "Player" };
}

export default async function PlayerPage({ params }: Props) {
  const { club, id } = await params;
  const { data, st } = await loadClub(club);
  const player = st.getPlayer(id);
  if (!player) notFound();

  const all = statsFor(player, st.played);
  const bySeason = [...st.seasons]
    .reverse()
    .map((s) => ({ season: s, stats: statsFor(player, st.inSeason(s)) }))
    .filter((r) => r.stats.apps > 0);
  const log = [...st.played].reverse().filter((m) => m.squad.includes(id));
  const moments = data.moments.filter((m) => m.player === id);

  // Squad order (active players by shirt number), wrapping round, for "Next player".
  const squad = data.players
    .filter((p) => p.active)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name));
  const at = squad.findIndex((p) => p.id === id);
  const next = squad.length > 1 ? squad[(at + 1) % squad.length] : null;
  const [first, ...others] = player.name.trim().split(/\s+/);
  const rest = others.join(" ");

  return (
    <>
      <section className="ph" aria-label={player.name} style={{ "--ph-bright": brighten(data.club.accent) } as CSSProperties}>
        {/* A stadium at night, out of focus and darkened, with the club colour glowing behind the shirt. */}
        <div className="ph-bg" aria-hidden="true">
          <Image src={stadium} alt="" fill sizes="(max-width: 720px) 100vw, 1120px" placeholder="blur" priority className="ph-photo" />
        </div>
        <Kit main={data.club.accent} trim={data.club.gold} number={player.number} logo={data.club.logo} className="ph-kit" />

        <nav className="ph-top">
          <Link href={`${st.base}/players`} className="ph-nav">
            <span className="ph-round" aria-hidden="true">‹</span>
            All players
          </Link>
          {next && (
            <Link href={`${st.base}/players/${next.id}`} className="ph-nav">
              Next player
              <span className="ph-round" aria-hidden="true">›</span>
            </Link>
          )}
        </nav>

        <div className="ph-id">
          <div className="ph-eyebrow">
            {player.number != null ? `Number ${player.number}` : POSITION_NAMES[player.position]}
            {player.nickname && <> · “{player.nickname}”</>}
          </div>
          <h1 className="ph-name">
            <span>{first}</span>
            {rest && (
              <span>
                {rest}
                <Crest short={data.club.shortName} logo={data.club.logo} size={40} />
              </span>
            )}
          </h1>
          <div className="ph-role">
            <span className="ph-pill">{player.position}</span>
            {POSITION_NAMES[player.position]}
            {!player.active && <> · no longer active</>}
          </div>
        </div>

        <div className="ph-feature">
          <div className="ph-feature-top">
            <Crest short={data.club.shortName} logo={data.club.logo} size={22} />
            <Sparkline points={log.slice().reverse().map((m) => (m.result === "W" ? 3 : m.result === "D" ? 1 : 0))} />
          </div>
          <div className="ph-feature-body">
            <div className="ph-feature-value">{all.apps ? `${Math.round(all.winPct)}%` : "–"}</div>
            <div className="ph-feature-label">Win rate with {first} on the pitch</div>
          </div>
        </div>

        <aside className="ph-matches">
          <div className="ph-matches-head">
            <span>{data.club.voetbal?.league?.replace(/^.*? - /, "") ?? "Recent matches"}</span>
            <span className="ph-matches-sub">Last {Math.min(5, log.length)}</span>
          </div>
          {log.length ? (
            <ol>
              {log.slice(0, 5).map((m) => {
                const home = m.venue === "H";
                const us = <Crest short={data.club.shortName} logo={data.club.logo} size={22} />;
                const them = <TeamLogo code={m.opponentCode} name={m.opponent} size={26} />;
                const g = m.goals.filter((x) => x.scorer === id).length;
                return (
                  <li key={m.id}>
                    <Link href={`${st.base}/matches/${m.id}`} className={`ph-match ph-match-${m.result}`}>
                      <span className="ph-match-team">
                        {home ? us : them}
                        <small>{home ? data.club.shortName : abbr(m.opponent)}</small>
                      </span>
                      <span className="ph-match-mid">
                        <span className="ph-match-pill">{g ? `⚽ ${g}` : m.motm === id ? "MOTM" : m.result}</span>
                        <span className="ph-match-score">
                          {home ? m.gf : m.ga}
                          <i>:</i>
                          {home ? m.ga : m.gf}
                        </span>
                      </span>
                      <span className="ph-match-team">
                        {home ? them : us}
                        <small>{home ? abbr(m.opponent) : data.club.shortName}</small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="ph-empty">No appearances yet.</p>
          )}
        </aside>
        <a className="ph-credit" href="https://commons.wikimedia.org/wiki/File:Mecz_pi%C5%82karski_Wis%C5%82a_Krak%C3%B3w_-_Zag%C5%82%C4%99bie_Sosnwoiec,_28_pa%C5%BAdziernika_2022,_Po%C5%BCegnanie_Stadionu_Ludowego,_KP.jpg" target="_blank" rel="noreferrer">
          Photo: Krzysztof Popławski, CC BY 4.0
        </a>
      </section>

      <div className="ph-more">
        <div className="ph-stats">
          {[
            { label: "Apps", value: all.apps },
            { label: "Goals", value: all.goals },
            { label: "Assists", value: all.assists },
            { label: "MOTM", value: all.motm },
            { label: "W–D–L", value: `${all.wins}–${all.draws}–${all.losses}` },
            ...(["GK", "DEF"].includes(positionGroup(player.position)) ? [{ label: "Clean sheets", value: all.cleanSheets }] : []),
            { label: "Cards", value: all.yellows + all.reds ? `${all.yellows}Y ${all.reds}R` : "0" },
          ].map((t) => (
            <div key={t.label} className="ph-stat">
              <span className="ph-stat-value">{t.value}</span>
              <span className="ph-stat-label">{t.label}</span>
            </div>
          ))}
        </div>

        {player.bio && <p className="ph-bio">{player.bio}</p>}

        {moments.map((m) => (
          <div key={m.id} className={`ph-moment ph-moment-${m.kind}`}>
            <span className="ph-moment-kind">{m.kind === "fame" ? "Hall of Fame" : "Hall of Shame"}</span>
            <strong>{m.title}</strong>
            {m.story && <p>{m.story}</p>}
          </div>
        ))}

        {bySeason.length > 1 && (
          <section className="ph-block">
            <h2>By season</h2>
            <ul className="ph-seasons">
              {bySeason.map(({ season, stats }) => (
                <li key={season}>
                  <span>{seasonLabel(season)}</span>
                  <span>{stats.apps} apps</span>
                  <span>{stats.goals} G</span>
                  <span>{stats.assists} A</span>
                  <span>{Math.round(stats.winPct)}% won</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="ph-block">
          <h2>
            Every match <span>{log.length}</span>
          </h2>
          {log.length ? (
            <ol className="ph-log">
              {log.map((m) => {
                const g = m.goals.filter((x) => x.scorer === id).length;
                const a = m.goals.filter((x) => x.assist === id).length;
                const cards = m.cards.filter((c) => c.player === id);
                const bits = [
                  g && `⚽ ${g > 1 ? `×${g}` : ""}`.trim(),
                  a && `${a} assist${a > 1 ? "s" : ""}`,
                  m.motm === id && "MOTM",
                  m.ownGoals.includes(id) && "own goal",
                  m.penaltiesMissed.includes(id) && "missed pen",
                ].filter(Boolean);
                return (
                  <li key={m.id}>
                    <Link href={`${st.base}/matches/${m.id}`} className={`ph-log-row ph-match-${m.result}`}>
                      <span className="ph-log-date">{formatDate(m.date, { day: "numeric", month: "short" })}</span>
                      <TeamLogo code={m.opponentCode} name={m.opponent} size={28} />
                      <span className="ph-log-team">
                        {m.opponent}
                        <small>
                          {m.venue === "H" ? "Home" : "Away"}
                          <span className="ph-log-inline-date"> · {formatDate(m.date, { day: "numeric", month: "short" })}</span>
                        </small>
                      </span>
                      <span className="ph-log-bits">
                        {bits.join(" · ")}
                        {cards.map((c, i) => (
                          <span key={i} className={c.type === "Y" ? "card-y" : "card-r"} title={c.type === "Y" ? "Yellow card" : "Red card"} />
                        ))}
                      </span>
                      <span className="ph-log-score">
                        {m.gf}–{m.ga}
                      </span>
                      <span className="ph-log-result">{m.result}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="ph-empty">Yet to make a debut.</p>
          )}
        </section>
      </div>
    </>
  );
}

/** "SCPB'22 2" → "SCP": three letters for the small label under a crest. */
function abbr(name: string): string {
  const word = name.replace(/^(afc|asv|avv|sv|vv|rksv|sc|fc)\s+/i, "").replace(/[^A-Za-z ]/g, "").trim().split(/\s+/)[0] ?? name;
  return word.slice(0, 3).toUpperCase();
}

/** Points per game across the player's matches, oldest first, as a thin line. */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 28;
  // A rolling average reads as form; raw 3/1/0 points zigzag too much.
  const smooth = points.map((_, i) => {
    const win = points.slice(Math.max(0, i - 2), i + 1);
    return win.reduce((a, b) => a + b, 0) / win.length;
  });
  const xy = smooth.map((v, i) => [(i / (smooth.length - 1)) * w, h - 3 - (v / 3) * (h - 6)] as const);
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="ph-spark" aria-hidden="true">
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3.5" fill="currentColor" />
    </svg>
  );
}
