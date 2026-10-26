"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { initials, Notice, shrinkImage, slugify, Submit } from "@/components/forms";
import { Crest } from "@/components/ui";
import { createClub, findVoetbalTeam, slugProblem } from "@/lib/actions";
import { inkFor } from "@/lib/color";
import { tidyTeamName } from "@/lib/lineup";
import { formatDate } from "@/lib/stats";
import type { TeamPreview } from "@/lib/voetbal";

// Sign-up as a short run of screens, one question each. Everything lives in one form so the last step
// submits it all; earlier screens are only hidden, never unmounted.

type Step = "team" | "club" | "claim";
const STEPS: Step[] = ["team", "club", "claim"];
/** The welcome screens after sign-up (squad, done) continue the same progress bar. */
export const ONBOARDING_TOTAL = 5;

const DEFAULT_ACCENT = "#17663f";
const DEFAULT_TRIM = "#b07d0c";

export function Onboarding({ host }: { host: string }) {
  const [state, formAction] = useActionState(createClub, {});
  const [step, setStep] = useState<Step>("team");
  const [team, setTeam] = useState<TeamPreview | null>(null);

  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState({ short: false, slug: false });
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [trim, setTrim] = useState(DEFAULT_TRIM);
  const [logo, setLogo] = useState<string | null>(null);
  const [fromCrest, setFromCrest] = useState(false);

  const index = STEPS.indexOf(step);
  const theme = { "--accent": accent, "--gold": trim, "--accent-ink": inkFor(accent) } as CSSProperties;

  function rename(next: string) {
    setName(next);
    if (!touched.short) setShort(initials(next));
    if (!touched.slug) setSlug(slugify(next));
  }

  async function confirmTeam(t: TeamPreview) {
    setTeam(t);
    rename(tidyTeamName(t.name));
    if (t.logo) {
      // Redrawn as a small PNG like any upload, then the crest suggests the colours.
      const png = await redraw(t.logo);
      setLogo(png);
      const colours = await crestColours(png);
      if (colours) {
        setAccent(colours[0]);
        setTrim(colours[1]);
        setFromCrest(true);
      }
    }
    setStep("club");
  }

  return (
    <div className="club-theme onb" style={theme}>
      <div className="onb-shell">
        <header className="onb-top">
          {index > 0 ? (
            <button type="button" className="btn-link" onClick={() => setStep(STEPS[index - 1])}>
              ← Back
            </button>
          ) : (
            <Link href="/" className="btn-link">
              ← Home
            </Link>
          )}
          <Progress at={index + 1} />
        </header>

        <form action={formAction} className="onb-form">
          <input type="hidden" name="voetbalTeam" value={team?.teamId ?? ""} />
          <input type="hidden" name="accent" value={accent} />
          <input type="hidden" name="gold" value={trim} />
          <input type="hidden" name="logo" value={logo ?? ""} />

          <section hidden={step !== "team"}>
            <TeamStep
              team={team}
              onConfirm={confirmTeam}
              onSkip={() => {
                setTeam(null);
                setStep("club");
              }}
            />
          </section>

          <section hidden={step !== "club"} className="onb-step">
            <StepTitle kicker="Your club" title="Make it yours">
              {team ? "We filled this in from voetbal.nl. Change anything that's off." : "How your club shows up on every page and graphic."}
            </StepTitle>

            <div className="onb-preview">
              <Crest short={short || "?"} logo={logo} size={64} />
              <div>
                <div className="onb-preview-name">{name || "Your club"}</div>
                <div className="small muted">{team?.league ?? "Sunday league"}</div>
              </div>
            </div>

            <div className="form">
              <label>
                Club name
                <input name="name" required maxLength={60} value={name} placeholder="e.g. Sunday Rovers" onChange={(e) => rename(e.target.value)} />
              </label>
              <div className="form-row">
                <label>
                  Badge letters
                  <input
                    name="shortName"
                    required
                    maxLength={5}
                    value={short}
                    onChange={(e) => {
                      setTouched((t) => ({ ...t, short: true }));
                      setShort(e.target.value.toUpperCase());
                    }}
                  />
                </label>
                <label>
                  Founded <span className="muted">(optional)</span>
                  <input name="founded" type="number" min={1850} max={2100} inputMode="numeric" placeholder="1907" />
                </label>
              </div>

              <div className="onb-colours">
                <ColourPick label="Main colour" value={accent} onChange={(v) => (setAccent(v), setFromCrest(false))} />
                <ColourPick label="Second colour" value={trim} onChange={(v) => (setTrim(v), setFromCrest(false))} />
              </div>
              {fromCrest && <p className="small muted onb-hint">Colours picked from your crest.</p>}

              <CrestPicker
                logo={logo}
                onChange={async (png) => {
                  setLogo(png);
                  const colours = png ? await crestColours(png) : null;
                  if (colours) {
                    setAccent(colours[0]);
                    setTrim(colours[1]);
                    setFromCrest(true);
                  }
                }}
              />

              <details className="onb-more">
                <summary>Add a tagline</summary>
                <label>
                  Tagline <span className="muted">(under the club name)</span>
                  <input name="tagline" maxLength={120} placeholder="Every goal, every card, every excuse." />
                </label>
              </details>
            </div>

            <div className="onb-actions">
              <button
                type="button"
                className="btn btn-lg"
                disabled={name.trim().length < 2 || !short.trim()}
                onClick={() => setStep("claim")}
              >
                Continue
              </button>
            </div>
          </section>

          <section hidden={step !== "claim"} className="onb-step">
            <StepTitle kicker="Almost there" title="Claim your page">
              Anyone with the link can follow the club. Only someone with the admin password can change things.
            </StepTitle>
            <ClaimStep host={host} slug={slug} onSlug={(v) => (setSlug(v), setTouched((t) => ({ ...t, slug: true })))} />
            <Notice state={state} />
            <div className="onb-actions">
              <Submit className="btn btn-lg" pending={team ? "Creating your club…" : "Creating…"}>
                Create {name || "club"}
              </Submit>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

// ---------- pieces ----------

export function Progress({ at }: { at: number }) {
  return (
    <div className="onb-progress" role="progressbar" aria-valuemin={1} aria-valuemax={ONBOARDING_TOTAL} aria-valuenow={at} aria-label={`Step ${at} of ${ONBOARDING_TOTAL}`}>
      {Array.from({ length: ONBOARDING_TOTAL }, (_, i) => (
        <span key={i} className={i < at ? "is-done" : undefined} />
      ))}
    </div>
  );
}

export function StepTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="onb-title">
      <div className="kicker">{kicker}</div>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

function TeamStep({ team, onConfirm, onSkip }: { team: TeamPreview | null; onConfirm: (t: TeamPreview) => void; onSkip: () => void }) {
  const [link, setLink] = useState("");
  const [found, setFound] = useState<TeamPreview | null>(team);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function find() {
    setBusy(true);
    setError("");
    const res = await findVoetbalTeam(link);
    setBusy(false);
    if ("error" in res) setError(res.error);
    else setFound(res.team);
  }

  if (found)
    return (
      <div className="onb-step">
        <StepTitle kicker="Found it" title="Is this your team?" />
        <div className="onb-team">
          {found.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={found.logo} alt="" width={96} height={96} />
          ) : (
            <span className="onb-team-blank">{initials(found.name)}</span>
          )}
          <div className="onb-team-name">{found.name}</div>
          {found.league && <div className="muted">{found.league}</div>}
          <dl className="onb-team-facts">
            {found.standing && (
              <div>
                <dt>Table</dt>
                <dd>
                  {ordinal(found.standing.position)} of {found.standing.teams} · {found.standing.points} {found.standing.points === 1 ? "pt" : "pts"}
                </dd>
              </div>
            )}
            {found.next && (
              <div>
                <dt>Next up</dt>
                <dd>
                  {found.next.home ? "vs" : "at"} {found.next.opponent} · {formatDate(found.next.date)}
                  {found.next.kickoff && `, ${found.next.kickoff}`}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className="onb-actions">
          <button
            type="button"
            className="btn btn-lg"
            disabled={confirming}
            onClick={async () => {
              setConfirming(true);
              await onConfirm(found);
              setConfirming(false);
            }}
          >
            {confirming ? "One moment…" : "Yes, that's us"}
          </button>
          <button type="button" className="btn-link" onClick={() => setFound(null)}>
            No, try another link
          </button>
        </div>
      </div>
    );

  return (
    <div className="onb-step">
      <StepTitle kicker="Let's set up your club" title="Find your team">
        Paste your team&apos;s link from voetbal.nl. We&apos;ll bring in your crest, fixtures, results and the league table, and keep them up to date.
      </StepTitle>
      <div className="form">
        <label>
          voetbal.nl team link
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            value={link}
            placeholder="voetbal.nl/team/T1628317720/overzicht"
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              // Enter here looks the team up instead of submitting the whole sign-up.
              if (e.key === "Enter") {
                e.preventDefault();
                if (link.trim() && !busy) find();
              }
            }}
          />
        </label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <details className="onb-more">
          <summary>Where do I find the link?</summary>
          <ol className="onb-how">
            <li>Open voetbal.nl and log in.</li>
            <li>Go to your team. Search the club, then pick your team, e.g. &ldquo;Zondag 2&rdquo;.</li>
            <li>Copy the address from the browser bar. It looks like voetbal.nl/team/T1628317720/overzicht.</li>
          </ol>
        </details>
      </div>
      <div className="onb-actions">
        <button type="button" className="btn btn-lg" disabled={!link.trim() || busy} onClick={find}>
          {busy ? "Looking up your team…" : "Find my team"}
        </button>
        <button type="button" className="btn-link" onClick={onSkip}>
          We&apos;re not on voetbal.nl
        </button>
      </div>
    </div>
  );
}

function ColourPick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="onb-colour">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span>
        {label}
        <span className="small muted">{value.toUpperCase()}</span>
      </span>
    </label>
  );
}

function CrestPicker({ logo, onChange }: { logo: string | null; onChange: (png: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return (
    <div className="onb-crest">
      <input
        ref={input}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError("");
          if (file.size > 5_000_000) return setError("That file is over 5 MB. Pick a smaller one.");
          try {
            onChange(await shrinkImage(file, 256));
          } catch {
            setError("Couldn't read that image. Try a PNG or JPG.");
          }
        }}
      />
      <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()}>
        {logo ? "Change crest" : "Upload crest"}
      </button>
      {logo && (
        <button type="button" className="btn-link danger" onClick={() => onChange(null)}>
          Remove
        </button>
      )}
      {error ? <p className="notice notice-error" role="alert">{error}</p> : !logo && <span className="small muted">No crest? The badge uses your colours and letters.</span>}
    </div>
  );
}

function ClaimStep({ host, slug, onSlug }: { host: string; slug: string; onSlug: (v: string) => void }) {
  const [problem, setProblem] = useState<string | null | undefined>(undefined);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setProblem(undefined);
    if (!slug) return;
    const timer = setTimeout(() => slugProblem(slug).then(setProblem), 350);
    return () => clearTimeout(timer);
  }, [slug]);

  return (
    <div className="form">
      <label>
        Web address
        <div className="input-prefix">
          <span>{host}/c/</span>
          <input
            name="slug"
            required
            maxLength={40}
            autoCapitalize="none"
            autoComplete="off"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(e) => onSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          />
        </div>
      </label>
      <p className={`small onb-slug ${problem ? "is-bad" : problem === null ? "is-ok" : ""}`} aria-live="polite">
        {!slug ? "Pick the address people will open." : problem === undefined ? "Checking…" : problem ?? "✓ That address is free."}
      </p>

      <label>
        Admin password
        <div className="onb-password">
          <input type={show ? "text" : "password"} name="password" required minLength={6} autoComplete="new-password" />
          <button type="button" className="btn-link" onClick={() => setShow((s) => !s)}>
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </label>
      <label>
        Type it again
        <input type={show ? "text" : "password"} name="confirm" required minLength={6} autoComplete="new-password" />
      </label>
      <p className="small muted">At least 6 characters. You can add a separate coach password later, for setting line-ups only.</p>
    </div>
  );
}

// ---------- helpers ----------

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** A data URL redrawn as a PNG of at most 256px, the same as an uploaded crest. */
async function redraw(src: string): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * The crest's two main colours: the most common colourful one first, then the most common one clearly
 * different from it (often black or white trim). White background and anti-aliased edges are ignored.
 */
async function crestColours(src: string): Promise<[string, string] | null> {
  try {
    const img = await loadImage(src);
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 200 || (r > 235 && g > 235 && b > 235)) continue;
      const key = `${r >> 5},${g >> 5},${b >> 5}`;
      const s = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      buckets.set(key, { r: s.r + r, g: s.g + g, b: s.b + b, n: s.n + 1 });
    }
    const colours = [...buckets.values()]
      .filter((c) => c.n > 6)
      .map((c) => {
        const [r, g, b] = [c.r / c.n, c.g / c.n, c.b / c.n];
        const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
        return { r, g, b, n: c.n, sat };
      });
    if (!colours.length) return null;
    const main = [...colours].sort((a, b) => b.n * (0.25 + b.sat) - a.n * (0.25 + a.sat))[0];
    const far = (c: (typeof colours)[number]) => Math.hypot(c.r - main.r, c.g - main.g, c.b - main.b) > 90;
    const second = colours.filter(far).sort((a, b) => b.n - a.n)[0];
    return [hex(main.r, main.g, main.b), second ? hex(second.r, second.g, second.b) : "#ffffff"];
  } catch {
    return null;
  }
}
