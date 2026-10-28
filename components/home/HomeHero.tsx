"use client";

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { amsterdam } from "@/lib/time";

const EASE = [0.22, 1, 0.36, 1] as const;

export interface HeroFixture {
  href: string;
  /** Kick-off as epoch ms, or null when only the date is known. */
  at: number | null;
  /** Midnight of match day in Amsterdam, epoch ms, for "in 4 days" when there's no kick-off time. */
  day: number;
  when: string;
  meta: string;
  home: { name: string; crest: ReactNode };
  away: { name: string; crest: ReactNode };
}

/**
 * The floodlit stadium, full screen. The photo drifts slower than the page, a blue floodlight glow follows the
 * pointer, the two crests slide in to meet at the halfway line, and the clock counts down to kick-off.
 */
export function HomeHero({
  photo,
  title,
  tagline,
  fixture,
  actions,
}: {
  photo: ReactNode;
  title: string;
  tagline?: string | null;
  fixture: HeroFixture | null;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-12%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0.2]);

  // The glow trails the pointer on a spring; it rests top right, where the floodlights are.
  const gx = useMotionValue(0.72);
  const gy = useMotionValue(0.3);
  const sx = useSpring(gx, { stiffness: 40, damping: 18 });
  const sy = useSpring(gy, { stiffness: 40, damping: 18 });
  const left = useTransform(sx, (v) => `${v * 100}%`);
  const top = useTransform(sy, (v) => `${v * 100}%`);

  const now = useNow();
  const until = fixture ? countdown(fixture, now) : null;

  return (
    <section
      ref={ref}
      className="hx-hero"
      aria-labelledby="hx-title"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        gx.set((e.clientX - r.left) / r.width);
        gy.set((e.clientY - r.top) / r.height);
      }}
    >
      <motion.div className="hx-hero-photo" style={{ y: photoY }} aria-hidden="true">
        {photo}
      </motion.div>
      <motion.div className="hx-glow" style={{ left, top }} aria-hidden="true" />
      <div className="hx-glow hx-glow-still" aria-hidden="true" />

      <motion.div className="hx-hero-inner" style={{ y: contentY, opacity: fade }}>
        <div className="hx-hero-copy">
          <motion.h1
            id="hx-title"
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            {title}
            <em>{until ? until.headline : "Season on."}</em>
          </motion.h1>
          {tagline && (
            <motion.p initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}>
              {tagline}
            </motion.p>
          )}
          <motion.div className="hx-actions" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}>
            {actions}
          </motion.div>
        </div>

        {fixture && (
          <motion.div
            className="hx-fixture"
            initial={reduce ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
          >
            <span className="hx-fixture-label">Next match</span>
            <Link href={fixture.href} className="hx-faceoff">
              <motion.span className="hx-team" initial={reduce ? false : { x: -48, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, ease: EASE, delay: 0.35 }}>
                {fixture.home.crest}
                <span>{fixture.home.name}</span>
              </motion.span>
              <span className="hx-vs">vs</span>
              <motion.span className="hx-team" initial={reduce ? false : { x: 48, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, ease: EASE, delay: 0.35 }}>
                {fixture.away.crest}
                <span>{fixture.away.name}</span>
              </motion.span>
            </Link>
            <div className="hx-when">
              <strong>{fixture.when}</strong>
              <span>{fixture.meta}</span>
            </div>
            {until?.clock && (
              <ol className="hx-clock" aria-label={`Kick-off in ${until.clock.map((c) => `${c.value} ${c.label}`).join(", ")}`}>
                {until.clock.map((c) => (
                  <li key={c.label}>
                    <span className="hx-clock-n">{String(c.value).padStart(2, "0")}</span>
                    <span className="hx-clock-l">{c.label}</span>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

/** The time, ticking each second once mounted. Null on the server, so nothing renders a stale clock. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function countdown(f: HeroFixture, now: number | null) {
  if (now === null) return { headline: "Matchday soon.", clock: null };
  const target = f.at ?? f.day;
  const ms = target - now;
  const days = Math.floor((f.day - startOfToday(now)) / 86_400_000);
  if (f.at !== null && ms <= 0 && ms > -2 * 3_600_000) return { headline: "We're playing.", clock: null };
  const headline = days <= 0 ? "Matchday today." : days === 1 ? "Matchday tomorrow." : `Matchday in ${days} days.`;
  if (f.at === null || ms <= 0) return { headline, clock: null };
  const s = Math.floor(ms / 1000);
  return {
    headline,
    clock: [
      { value: Math.floor(s / 86400), label: "days" },
      { value: Math.floor((s % 86400) / 3600), label: "hours" },
      { value: Math.floor((s % 3600) / 60), label: "min" },
      { value: s % 60, label: "sec" },
    ],
  };
}

/** Midnight in Amsterdam for the day containing `now`. */
function startOfToday(now: number): number {
  const iso = new Date(now).toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
  return amsterdam(iso);
}
