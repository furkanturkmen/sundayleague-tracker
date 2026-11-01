"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useT } from "@/components/I18n";
import { Progress, StepTitle } from "@/components/Onboarding";
import { RecoveryCode } from "@/components/RecoveryCode";
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
  /** Set when voetbal.nl hid players with a private profile from the line-ups. */
  hiddenNote: string | null;
  /** The club's public address without the scheme, e.g. "example.com/c/afc-dws-2". */
  url: string;
  nextMatch: { id: string; opponent: string; date: string } | null;
  hasRecovery: boolean;
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
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // The sync is one request; the list fills in as a rough sense of progress and completes when it returns.
    const timer = setInterval(() => setTick((n) => Math.min(n + 1, SYNC_PARTS.length - 1)), 2500);
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
      <StepTitle kicker={t("Setting up")} title={t("Pulling in your season")}>
        {t("Reading your matches from voetbal.nl. This takes about half a minute.")}
      </StepTitle>
      <ul className="onb-sync">
        {SYNC_PARTS.map((part, i) => (
          <li key={part} className={i < tick ? "is-done" : i === tick && !error ? "is-busy" : undefined}>
            <span className="onb-sync-dot" aria-hidden="true" />
            {t(part)}
          </li>
        ))}
      </ul>
      {error && (
        <>
          <p className="notice notice-error" role="alert">
            {t(error)} {t("You can try again later from Settings.")}
          </p>
          <div className="onb-actions">
            <button type="button" className="btn btn-lg" onClick={() => router.replace(`/start/${slug}?step=squad`)}>
              {t("Continue without it")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SquadStep({ slug, linked, counts, suggestions, syncError, hiddenNote }: Props) {
  const t = useT();
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
          ✓{" "}
          {counts.table
            ? counts.results
              ? t("{matches} matches, {results} results and the league table are in.", { matches: counts.matches, results: counts.results })
              : t("{matches} matches and the league table are in.", { matches: counts.matches })
            : counts.results
              ? t("{matches} matches and {results} results are in.", { matches: counts.matches, results: counts.results })
              : t("{matches} matches are in.", { matches: counts.matches })}
        </p>
      )}
      <StepTitle kicker={t("Your squad")} title={t("Who plays for you?")}>
        {suggestions.length
          ? t("These names come from your line-ups on voetbal.nl. Untick anyone who isn't in the squad, like a guest player.")
          : t("Add the players now, or later from Settings. Numbers, positions and photos come later.")}
      </StepTitle>

      {hiddenNote && (
        <p className="notice notice-warn">
          {hiddenNote} <a href={`/c/${slug}/settings/voetbal`}>{t("voetbal.nl settings")}</a>
        </p>
      )}

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
              {t("Select all")}
            </button>
            <button type="button" className="btn-link" onClick={() => setPicked(new Set())}>
              {t("Clear")}
            </button>
          </div>
        </>
      )}

      <label className="form onb-extra">
        <span>{suggestions.length ? t("Anyone missing?") : t("Player names")}</span>
        <textarea
          rows={suggestions.length ? 3 : 6}
          value={extra}
          placeholder={`${t("One name per line, or paste them from the team chat")}\nBurak Yilmaz\nDaan de Vries`}
          onChange={(e) => setExtra(e.target.value)}
        />
      </label>

      {error && <p className="notice notice-error" role="alert">{t(error)}</p>}
      <div className="onb-actions">
        <button type="button" className="btn btn-lg" disabled={!total || busy} onClick={save}>
          {busy ? t("Adding…") : total ? (total === 1 ? t("Add 1 player") : t("Add {n} players", { n: total })) : t("Add players")}
        </button>
        <button type="button" className="btn-link" onClick={() => router.push(`/start/${slug}?step=done`)}>
          {counts.squad ? t("Done here") : t("Skip for now")}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ slug, club, url, nextMatch, hasRecovery }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const base = `/c/${slug}`;
  const full = `https://${url}`;
  const share = `${t("{club} now has its own page: results, stats and the table.", { club: club.name })} ${full}`;

  return (
    <div className="onb-step">
      <div className="onb-live">
        <Crest short={club.shortName} logo={club.logo} size={72} />
      </div>
      <StepTitle kicker={t("All set")} title={t("{club} is live", { club: club.name })}>
        {t("Share the link in the team chat. Everyone can follow along; only you can change things.")}
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
          {copied ? t("Copied") : t("Copy")}
        </button>
      </div>
      <a className="btn btn-secondary onb-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">
        {t("Share on WhatsApp")}
      </a>

      <h2 className="onb-next-title">{t("Keep the keys")}</h2>
      <p className="onb-recovery-note">{t("If the admin password ever gets lost, this code resets it from the sign-in page.")}</p>
      <RecoveryCode slug={slug} isSet={hasRecovery} />

      <h2 className="onb-next-title">{t("Next up")}</h2>
      <ul className="onb-next">
        <li>
          <Link href={`${base}/settings/squad`}>
            <strong>{t("Shirt numbers, positions and photos")}</strong>
            <span>{t("They make the line-up graphic look like the real thing.")}</span>
          </Link>
        </li>
        <li>
          <Link href={`${base}/settings/access#coach-login`}>
            <strong>{t("Give the coach a login")}</strong>
            <span>{t("A separate password that can only set line-ups.")}</span>
          </Link>
        </li>
        {nextMatch && (
          <li>
            <Link href={`${base}/matches/${nextMatch.id}`}>
              <strong>{t("Matchday post for {opponent}", { opponent: nextMatch.opponent })}</strong>
              <span>{t("{date}: Instagram graphics, ready to post.", { date: nextMatch.date })}</span>
            </Link>
          </li>
        )}
      </ul>

      <div className="onb-actions">
        <Link href={base} className="btn btn-lg">
          {t("Go to {club}", { club: club.name })}
        </Link>
      </div>
    </div>
  );
}
