import Link from "next/link";
import type { ReactNode } from "react";
import type { Stats } from "@/lib/stats";

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

/** An opponent's crest from voetbal.nl, or a neutral disc with their initial for matches logged by hand. */
export function TeamLogo({ code, name, size = 22 }: { code?: string | null; name: string; size?: number }) {
  if (code) return <img src={`/logos/${code}`} alt="" width={size} height={size} className="team-logo" loading="lazy" />;
  return (
    <span className="team-logo team-logo-blank" style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {name.replace(/^(afc|asv|avv|sv|vv|rksv|sc|fc)\s+/i, "").charAt(0).toUpperCase()}
    </span>
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
