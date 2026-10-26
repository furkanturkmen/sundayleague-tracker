"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Progress, StepTitle } from "@/components/Onboarding";
import { Crest } from "@/components/ui";
import { addPlayers, syncVoetbal } from "@/lib/actions";
import { inkFor } from "@/lib/color";

export type WelcomeStep = "sync" | "squad" | "done";

interface Props {
  step: WelcomeStep;
  slug: string;
  club: { name: string; shortName: string; logo: string | null; accent: string; gold: string };
  linked: boolean;
  syncError: string | null;
  counts: { matches: number; results: number; table: boolean; squad: number };
  suggestions: { name: string; games: number }[];
  /** The club's public address without the scheme, e.g. "example.com/c/afc-dws-2". */
  url: string;
  nextMatch: { id: string; opponent: string; date: string } | null;
}

export function Welcome(props: Props) {
  const { step, slug, club } = props;
  const theme = { "--accent": club.accent, "--gold": club.gold, "--accent-ink": inkFor(club.accent) } as CSSProperties;
  return (
    <div className="club-theme onb" style={theme}>
      <div className="onb-shell">
        <header className="onb-top">
          <span className="onb-club">
            <Crest short={club.shortName} logo={club.logo} size={22} />
            {club.name}
          </span>
          <Progress at={step === "done" ? 5 : 4} />
        </header>
        {step === "sync" && <SyncStep slug={slug} />}
        {step === "squad" && <SquadStep {...props} />}
        {step === "done" && <DoneStep {...props} />}
      </div>
    </div>
  );
}

const SYNC_PARTS = ["Fixtures", "Results", "League table", "Line-ups"];

/** Runs the first voetbal.nl sync as soon as the screen opens, then moves on to the squad. */
function SyncStep({ slug }: { slug: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // The sync is one request; the list fills in as a rough sense of progress and completes when it returns.
    const timer = setInterval(() => setTick((t) => Math.min(t + 1, SYNC_PARTS.length - 1)), 2500);
    syncVoetbal(slug).then((res) => {
      clearInterval(timer);
      if (res.error) return setError(res.error);
      setTick(SYNC_PARTS.length);
      setTimeout(() => router.replace(`/start/${slug}?step=squad`), 600);
    });
    return () => clearInterval(timer);
  }, [slug, router]);

  return (
    <div className="onb-step">
      <StepTitle kicker="Setting up" title="Pulling in your season">
        Reading your matches from voetbal.nl. This takes about half a minute.
      </StepTitle>
      <ul className="onb-sync">
        {SYNC_PARTS.map((part, i) => (
          <li key={part} className={i < tick ? "is-done" : i === tick && !error ? "is-busy" : undefined}>
            <span className="onb-sync-dot" aria-hidden="true" />
            {part}
          </li>
        ))}
      </ul>
      {error && (
        <>
          <p className="notice notice-error" role="alert">
            {error} You can try again later from Settings.
          </p>
          <div className="onb-actions">
            <button type="button" className="btn btn-lg" onClick={() => router.replace(`/start/${slug}?step=squad`)}>
              Continue without it
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SquadStep({ slug, linked, counts, suggestions, syncError }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState(() => new Set(suggestions.map((s) => s.name)));
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const typed = extra.split(/[\n,]/).map((s) => s.trim()).filter((s) => s.length >= 2);
  const total = picked.size + typed.length;

  async function save() {
    setBusy(true);
    setError("");
    const res = await addPlayers(slug, [...picked, ...typed]);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.push(`/start/${slug}?step=done`);
  }

  const toggle = (name: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="onb-step">
      {linked && !syncError && counts.matches > 0 && (
        <p className="onb-synced">
          ✓ {counts.matches} matches{counts.results ? `, ${counts.results} results` : ""}
          {counts.table ? " and the league table" : ""} are in.
        </p>
      )}
      <StepTitle kicker="Your squad" title="Who plays for you?">
        {suggestions.length
          ? "These names come from your line-ups on voetbal.nl. Untick anyone who isn't in the squad, like a guest player."
          : "Add the players now, or later from Settings. Numbers, positions and photos come later."}
      </StepTitle>

      {suggestions.length > 0 && (
        <>
          <div className="onb-chips">
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                className={`onb-chip ${picked.has(s.name) ? "is-on" : ""}`}
                aria-pressed={picked.has(s.name)}
                onClick={() => toggle(s.name)}
              >
                {s.name}
                <span>{s.games}×</span>
              </button>
            ))}
          </div>
          <div className="onb-chip-tools small">
            <button type="button" className="btn-link" onClick={() => setPicked(new Set(suggestions.map((s) => s.name)))}>
              Select all
            </button>
            <button type="button" className="btn-link" onClick={() => setPicked(new Set())}>
              Clear
            </button>
          </div>
        </>
      )}

      <label className="form onb-extra">
        <span>{suggestions.length ? "Anyone missing?" : "Player names"}</span>
        <textarea
          rows={suggestions.length ? 3 : 6}
          value={extra}
          placeholder={"One name per line, or paste them from the team chat\nBurak Yilmaz\nDaan de Vries"}
          onChange={(e) => setExtra(e.target.value)}
        />
      </label>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="onb-actions">
        <button type="button" className="btn btn-lg" disabled={!total || busy} onClick={save}>
          {busy ? "Adding…" : total ? `Add ${total} ${total === 1 ? "player" : "players"}` : "Add players"}
        </button>
        <button type="button" className="btn-link" onClick={() => router.push(`/start/${slug}?step=done`)}>
          {counts.squad ? "Done here" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ slug, club, url, nextMatch }: Props) {
  const [copied, setCopied] = useState(false);
  const base = `/c/${slug}`;
  const full = `https://${url}`;
  const share = `${club.name} now has its own page: results, stats and the table. ${full}`;

  return (
    <div className="onb-step">
      <div className="onb-live">
        <Crest short={club.shortName} logo={club.logo} size={72} />
      </div>
      <StepTitle kicker="All set" title={`${club.name} is live`}>
        Share the link in the team chat. Everyone can follow along; only you can change things.
      </StepTitle>

      <div className="onb-share">
        <code>{url}</code>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(full);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard blocked: the address is on screen to copy by hand.
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <a className="btn btn-secondary onb-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">
        Share on WhatsApp
      </a>

      <h2 className="onb-next-title">Next up</h2>
      <ul className="onb-next">
        <li>
          <Link href={`${base}/settings#squad`}>
            <strong>Shirt numbers, positions and photos</strong>
            <span>They make the line-up graphic look like the real thing.</span>
          </Link>
        </li>
        <li>
          <Link href={`${base}/settings#coach-login`}>
            <strong>Give the coach a login</strong>
            <span>A separate password that can only set line-ups.</span>
          </Link>
        </li>
        {nextMatch && (
          <li>
            <Link href={`${base}/matches/${nextMatch.id}`}>
              <strong>Matchday post for {nextMatch.opponent}</strong>
              <span>{nextMatch.date}: Instagram graphics, ready to post.</span>
            </Link>
          </li>
        )}
      </ul>

      <div className="onb-actions">
        <Link href={base} className="btn btn-lg">
          Go to {club.name}
        </Link>
      </div>
    </div>
  );
}
