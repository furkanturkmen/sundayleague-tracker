import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate, seasonLabel, type PlayedMatch, type Result, type Stats } from "@/lib/stats";

/** The club's uploaded logo, or a shield drawn in its colours when there isn't one. */
export function Crest({ short, logo, size = 44 }: { short: string; logo?: string | null; size?: number }) {
  // Same height as the shield; wide crests get up to twice its width instead of shrinking to fit.
  if (logo) {
    const height = Math.round(size * 1.15);
    return <img src={logo} alt="" height={height} className="crest crest-logo" style={{ height, maxWidth: size * 2 }} />;
  }
  const fontSize = short.length <= 3 ? 11 : short.length === 4 ? 9 : 7.5;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden="true" className="crest">
      <path d="M20 1 L38 7 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V7 Z" fill="var(--accent)" stroke="var(--gold)" strokeWidth="2" />
      <text x="20" y="26" textAnchor="middle" fontSize={fontSize} fontWeight="800" fill="var(--accent-ink)" letterSpacing="0.3">
        {short}
      </text>
      <circle cx="20" cy="35" r="2.2" fill="var(--gold)" />
    </svg>
  );
}

const resultWord: Record<Result, string> = { W: "Win", D: "Draw", L: "Loss" };

export function ResultBadge({ result }: { result: Result }) {
  return (
    <span className={`badge badge-${result}`} title={resultWord[result]} aria-label={resultWord[result]}>
      {result}
    </span>
  );
}

export function FormGuide({ st, matches }: { st: Stats; matches: PlayedMatch[] }) {
  return (
    <div className="form-guide">
      {matches.map((m) => (
        <Link key={m.id} href={`${st.base}/matches/${m.id}`} title={`${m.gf}–${m.ga} vs ${m.opponent}, ${formatDate(m.date)}`}>
          <ResultBadge result={m.result} />
        </Link>
      ))}
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="tile">
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

export function PlayerLink({ st, id }: { st: Stats; id: string }) {
  if (id === "og") return <span className="muted">Own goal</span>;
  return <Link href={`${st.base}/players/${id}`}>{st.playerName(id)}</Link>;
}

export function PageHeader({ title, kicker, children, actions }: { title: string; kicker?: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      {kicker && <div className="kicker">{kicker}</div>}
      <div className="page-title-row">
        <h1>{title}</h1>
        {actions}
      </div>
      {children}
    </header>
  );
}

export function SeasonTabs({ base, seasons, active, extra = "" }: { base: string; seasons: string[]; active: string; extra?: string }) {
  if (seasons.length < 2) return null;
  const opts = ["all", ...[...seasons].reverse()];
  return (
    <div className="tabs" aria-label="Season">
      {opts.map((s) => (
        <Link key={s} href={`${base}?season=${s}${extra}`} className={s === active ? "active" : undefined} aria-current={s === active ? "true" : undefined}>
          {seasonLabel(s)}
        </Link>
      ))}
    </div>
  );
}

export function MatchLine({ st, m }: { st: Stats; m: PlayedMatch }) {
  return (
    <Link href={`${st.base}/matches/${m.id}`} className="match-line">
      <ResultBadge result={m.result} />
      <span className="match-line-title">{st.fixtureTitle(m)}</span>
      {/* Same order as the title, home side first, so "Pancratius 4 vs DWS" reads 2–0, not 0–2. */}
      <span className="match-line-score">{m.venue === "H" ? `${m.gf}–${m.ga}` : `${m.ga}–${m.gf}`}</span>
      <span className="muted small">{formatDate(m.date)}</span>
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Shown where admins would add data, so a new club isn't a wall of blanks. */
export function GetStarted({ st, admin, what }: { st: Stats; admin: boolean; what: "players" | "matches" }) {
  return (
    <div className="card get-started">
      <p>{what === "players" ? "No players in the squad yet." : "No matches played yet."}</p>
      {admin ? (
        <Link className="btn" href={what === "players" ? `${st.base}/settings#squad` : `${st.base}/matches/new`}>
          {what === "players" ? "Add players" : "Log a match"}
        </Link>
      ) : (
        <p className="muted small">The club admin can add them after signing in.</p>
      )}
    </div>
  );
}
