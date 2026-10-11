import Link from "next/link";
import type { ReactNode } from "react";
import { fixtureTitle, formatDate, playerName, seasonLabel, type PlayedMatch, type Result } from "@/lib/stats";

export function Crest({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden="true" className="crest">
      <path d="M20 1 L38 7 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V7 Z" fill="var(--accent)" stroke="var(--gold)" strokeWidth="2" />
      <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--accent-ink)" letterSpacing="0.5">DWS</text>
      <text x="20" y="35" textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--gold)">AFC 2</text>
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

export function FormGuide({ matches }: { matches: PlayedMatch[] }) {
  return (
    <div className="form-guide">
      {matches.map((m) => (
        <Link key={m.id} href={`/matches/${m.id}`} title={`${m.gf}–${m.ga} vs ${m.opponent}, ${formatDate(m.date)}`}>
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

export function PlayerLink({ id }: { id: string }) {
  if (id === "og") return <span className="muted">Own goal</span>;
  return <Link href={`/players/${id}`}>{playerName(id)}</Link>;
}

export function PageHeader({ title, kicker, children }: { title: string; kicker?: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      {kicker && <div className="kicker">{kicker}</div>}
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function SeasonTabs({ base, seasons, active, extra = "" }: { base: string; seasons: string[]; active: string; extra?: string }) {
  const opts = ["all", ...[...seasons].reverse()];
  return (
    <div className="tabs" role="tablist" aria-label="Season">
      {opts.map((s) => (
        <Link key={s} href={`${base}?season=${s}${extra}`} className={s === active ? "active" : undefined} aria-current={s === active ? "true" : undefined}>
          {seasonLabel(s)}
        </Link>
      ))}
    </div>
  );
}

export function MatchLine({ m }: { m: PlayedMatch }) {
  return (
    <Link href={`/matches/${m.id}`} className="match-line">
      <ResultBadge result={m.result} />
      <span className="match-line-title">{fixtureTitle(m)}</span>
      <span className="match-line-score">{m.gf}–{m.ga}</span>
      <span className="muted small">{formatDate(m.date)}</span>
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
