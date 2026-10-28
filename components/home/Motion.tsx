"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

// Small motion pieces for the home screen. Everything renders in place without script, and with reduced motion
// the content simply appears.

const EASE = [0.22, 1, 0.36, 1] as const;

/** Rises 24px and fades in the first time it scrolls into view. Children marked .hx-stagger follow one by one. */
export function Reveal({ children, className, delay = 0, as = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/** A number that counts up from zero when it first comes into view. */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const n = useMotionValue(reduce ? value : 0);
  const shown = useTransform(n, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(n, value, { duration: 1.2, ease: EASE });
    return () => controls.stop();
  }, [inView, reduce, n, value]);
  return (
    <motion.span ref={ref} aria-label={`${value}${suffix}`}>
      {shown}
    </motion.span>
  );
}

/** Marks the page once it has scrolled, so the header can float as a pill. */
export function ScrollFlag() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => root.toggleAttribute("data-scrolled", window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      root.removeAttribute("data-scrolled");
    };
  }, []);
  return null;
}
