import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, ResultBadge, StatTile } from "@/components/ui";
import { loadClub } from "@/lib/club";
import { formatDate, seasonLabel, statsFor } from "@/lib/stats";

type Props = { params: Promise<{ club: string; id: string }> };

const POSITION = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" };

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

  return (
    <>
      <header className="page-header">
        <Link href={`${st.base}/players`} className="small muted">← Squad</Link>
        <div className="player-head">
          <div className="shirt">{player.number ?? player.name[0]}</div>
          <div>
            <h1>{player.name}</h1>
            <div className="muted">
              {POSITION[player.position]}
              {player.nickname && <> · “{player.nickname}”</>}
              {!player.active && <> · no longer active</>}
            </div>
          </div>
        </div>
        {player.bio && <p style={{ margin: 0, color: "var(--ink-2)" }}>{player.bio}</p>}
      </header>

      <div className="tiles">
        <StatTile label="Appearances" value={all.apps} />
        <StatTile label="Goals" value={all.goals} sub={all.pens ? `${all.pens} pen` : undefined} />
        <StatTile label="Assists" value={all.assists} />
        <StatTile label="Man of the Match" value={all.motm} />
        <StatTile label="Win rate" value={all.apps ? `${Math.round(all.winPct)}%` : "–"} sub={`${all.wins}W ${all.draws}D ${all.losses}L`} />
        {(player.position === "GK" || player.position === "DEF") && <StatTile label="Clean sheets" value={all.cleanSheets} />}
        <StatTile label="Cards" value={`${all.yellows} / ${all.reds}`} sub="yellow / red" />
        {all.ownGoals + all.pensMissed > 0 && <StatTile label="Shame" value={all.ownGoals + all.pensMissed} sub={`${all.ownGoals} OG, ${all.pensMissed} pen miss`} />}
      </div>

      {moments.length > 0 && (
        <div className="grid grid-2 section">
          {moments.map((m) => (
            <div key={m.id} className={`hall hall-${m.kind}`} style={{ padding: 16 }}>
              <div className="moment">
                <div className="kicker" style={{ color: "inherit" }}>{m.kind === "fame" ? "Hall of Fame" : "Hall of Shame"}</div>
                <h3>{m.title}</h3>
                {m.story && <p>{m.story}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-2 section">
        <div className="card">
          <h2>By season</h2>
          {bySeason.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Season</th>
                    <th className="num">Apps</th>
                    <th className="num">G</th>
                    <th className="num">A</th>
                    <th className="num">MOTM</th>
                    <th className="num">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {bySeason.map(({ season, stats }) => (
                    <tr key={season}>
                      <td>{seasonLabel(season)}</td>
                      <td className="num">{stats.apps}</td>
                      <td className="num">{stats.goals}</td>
                      <td className="num">{stats.assists}</td>
                      <td className="num">{stats.motm}</td>
                      <td className="num">{Math.round(stats.winPct)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Yet to make a debut.</Empty>
          )}
        </div>

        <div className="card">
          <h2>Match log</h2>
          {log.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th className="num">Score</th>
                    <th>Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((m) => {
                    const g = m.goals.filter((x) => x.scorer === id).length;
                    const a = m.goals.filter((x) => x.assist === id).length;
                    const cards = m.cards.filter((c) => c.player === id);
                    const bits = [
                      g && `${g} goal${g > 1 ? "s" : ""}`,
                      a && `${a} assist${a > 1 ? "s" : ""}`,
                      m.motm === id && "MOTM",
                      m.ownGoals.includes(id) && "own goal",
                      m.penaltiesMissed.includes(id) && "missed pen",
                    ].filter(Boolean);
                    return (
                      <tr key={m.id}>
                        <td><ResultBadge result={m.result} /></td>
                        <td className="muted">{formatDate(m.date, { day: "numeric", month: "short", year: "2-digit" })}</td>
                        <td>
                          <Link href={`${st.base}/matches/${m.id}`}>{m.opponent}</Link> <span className="muted small">({m.venue})</span>
                        </td>
                        <td className="num strong">{m.gf}–{m.ga}</td>
                        <td>
                          {bits.join(", ")}{" "}
                          {cards.map((c, i) => (
                            <span key={i} className={c.type === "Y" ? "card-y" : "card-r"} title={c.type === "Y" ? "Yellow card" : "Red card"} />
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No appearances yet.</Empty>
          )}
        </div>
      </div>
    </>
  );
}
