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
 * The floodlit stadium, full screen, telling one thing: when we play next. "Matchday in 3 days." large, the fixture as one line under it, and the actions with a quiet live countdown at the foot. The photo
 * drifts slower than the page and a faint blue glow follows the pointer.
 */
export function HomeHero({ photo, club, fixture, actions }: { photo: ReactNode; club: string; fixture: HeroFixture | null; actions: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-10%"]);
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
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.9, ease: EASE, delay },
  });

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
        <motion.h1 id="hx-title" {...rise(0)}>
          {/* The header already shows the club; the title keeps its name for screen readers and search only. */}
          <span className="sr-only">{club}: </span>
          <span className="hx-headline">
            {until ? until.lead : "Season"} <em>{until ? until.accent : "on."}</em>
          </span>
        </motion.h1>

        {fixture && (
          <motion.div className="hx-fixture" {...rise(0.12)}>
            <Link href={fixture.href} className="hx-faceoff">
              <span className="hx-team">
                {fixture.home.crest}
                {fixture.home.name}
              </span>
              <span className="hx-vs">vs</span>
              <span className="hx-team">
                {fixture.away.crest}
                {fixture.away.name}
              </span>
            </Link>
            <p className="hx-when">
              {fixture.when} · {fixture.meta}
            </p>
          </motion.div>
        )}

        <motion.div className="hx-foot" {...rise(0.24)}>
          <div className="hx-actions">{actions}</div>
          {until?.clock && (
            <div className="hx-clock" aria-hidden="true">
              <span className="hx-clock-lead">Kick-off in</span>
              {until.clock.map((c) => (
                <span key={c.label} className="hx-clock-part">
                  <b>{String(c.value).padStart(2, "0")}</b>
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </motion.div>
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

/** The headline in two parts ("Matchday in" + "3 days.") and the clock to kick-off, when there is a time. */
function countdown(f: HeroFixture, now: number | null) {
  if (now === null) return { lead: "Matchday", accent: "soon.", clock: null };
  const target = f.at ?? f.day;
  const ms = target - now;
  const days = Math.floor((f.day - startOfToday(now)) / 86_400_000);
  if (f.at !== null && ms <= 0 && ms > -2 * 3_600_000) return { lead: "We're", accent: "playing.", clock: null };
  const head = days <= 0 ? { lead: "Matchday", accent: "today." } : days === 1 ? { lead: "Matchday", accent: "tomorrow." } : { lead: "Matchday in", accent: `${days} days.` };
  if (f.at === null || ms <= 0) return { ...head, clock: null };
  const s = Math.floor(ms / 1000);
  return {
    ...head,
    clock: [
      { value: Math.floor(s / 86400), label: "d" },
      { value: Math.floor((s % 86400) / 3600), label: "h" },
      { value: Math.floor((s % 3600) / 60), label: "m" },
      { value: s % 60, label: "s" },
    ],
  };
}

/** Midnight in Amsterdam for the day containing `now`. */
function startOfToday(now: number): number {
  const iso = new Date(now).toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
  return amsterdam(iso);
}
