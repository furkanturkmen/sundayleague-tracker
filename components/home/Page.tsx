import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { brighten } from "@/lib/color";
import { seasonLabel } from "@/lib/stats";
import stadium from "@/public/images/stadium-floodlights.jpg";
import { Reveal, ScrollFlag } from "./Motion";

// The pieces every club page is built from, so each one opens on the same cold night as the home screen.

/** The root of a club page: the night ground, the club colour as light, and the floating header. */
export function Page({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <div className="hx" style={{ "--hx-bright": brighten(accent) } as CSSProperties}>
      <ScrollFlag />
      {children}
    </div>
  );
}

/**
 * The stadium at the top of a page: a big headline ending in one serif word, then a line of context. "short" is
 * for pages people read, "mini" for the forms, where the work should start near the top.
 */
export function PageHero({
  lead,
  accent,
  size = "short",
  back,
  meta,
  children,
}: {
  lead?: ReactNode;
  accent: ReactNode;
  size?: "short" | "mini";
  back?: { href: string; label: string };
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={`hx-hero hx-hero-short${size === "mini" ? " hx-hero-mini" : ""}`} aria-labelledby="page-title">
      <div className="hx-hero-photo" aria-hidden="true">
        <Image src={stadium} alt="" fill sizes="100vw" placeholder="blur" priority className="hx-photo" />
      </div>
      <div className="hx-hero-inner">
        {back && (
          <Reveal>
            <Link href={back.href} className="hx-back">
              <span aria-hidden="true">←</span> {back.label}
            </Link>
          </Reveal>
        )}
        <Reveal>
          <h1 id="page-title" className="hx-headline">
            {lead && <>{lead} </>}
            <em>{accent}</em>
          </h1>
        </Reveal>
        {(meta || children) && (
          <Reveal className="hx-meta" delay={0.1}>
            {meta && <p>{meta}</p>}
            {children}
          </Reveal>
        )}
      </div>
    </section>
  );
}

/** Big text tabs under a headline, the current one underlined in the club colour. */
export function PageTabs({ label, tabs }: { label: string; tabs: { href: string; label: string; on: boolean }[] }) {
  return (
    <nav className="hx-tabs" aria-label={label}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={t.on ? "on" : undefined} aria-current={t.on ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Stats | Records | Rankings, at the top of each. */
export function StatsNav({ base, active }: { base: string; active: "overview" | "records" | "rankings" }) {
  return (
    <PageTabs
      label="Stats"
      tabs={[
        { href: `${base}/stats`, label: "Overview", on: active === "overview" },
        { href: `${base}/stats/records`, label: "Records", on: active === "records" },
        { href: `${base}/stats/rankings`, label: "Rankings", on: active === "rankings" },
      ]}
    />
  );
}

/** All time and each season as quiet links; the one showing is white and underlined. */
export function SeasonLinks({
  href,
  seasons,
  active,
  children,
}: {
  href: (season: string) => string;
  seasons: string[];
  active: string;
  children?: ReactNode;
}) {
  const opts = seasons.length > 1 ? ["all", ...[...seasons].reverse()] : [];
  if (!opts.length && !children) return null;
  return (
    <nav className="hx-seasons" aria-label="Season">
      {opts.map((s) => (
        <Link key={s} href={href(s)} className={s === active ? "on" : undefined} aria-current={s === active ? "true" : undefined}>
          {seasonLabel(s)}
        </Link>
      ))}
      {children}
    </nav>
  );
}

/** A section of a page body: a heading with one serif word, an optional note on the right, then the content. */
export function Section({
  id,
  lead,
  accent,
  note,
  small,
  children,
}: {
  id: string;
  lead?: ReactNode;
  accent: ReactNode;
  note?: ReactNode;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`hx-sec${small ? " hx-sec-sm" : ""}`} aria-labelledby={id}>
      <Reveal className="hx-head">
        <h2 id={id}>
          {lead && <>{lead} </>}
          <em>{accent}</em>
        </h2>
        {note && <p>{note}</p>}
      </Reveal>
      {children}
    </section>
  );
}

/** Faint pitch markings: the touchlines, halfway line and centre circle, drawn to cover a band. */
export function Pitch() {
  return (
    <svg className="hx-pitch" viewBox="0 0 1050 680" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="20" y="20" width="1010" height="640" />
        <line x1="525" y1="20" x2="525" y2="660" />
        <circle cx="525" cy="340" r="140" />
        <circle cx="525" cy="340" r="3" fill="currentColor" />
      </g>
    </svg>
  );
}
