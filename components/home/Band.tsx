"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * A full-width section with its own ground, laid over the one before it like a sheet on a stack. As the next
 * band slides up over it, this one sinks back: it shrinks a touch and darkens, so the page reads in layers.
 */
export function Band({ className, labelledBy, bg, children }: { className: string; labelledBy: string; bg?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // 0 while the band's foot is still below the window; 1 once it has scrolled a window's height past.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["end end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.94]);
  const dim = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 0.6]);

  return (
    <motion.section ref={ref} className={`hx-band ${className}`} aria-labelledby={labelledBy} style={{ scale }}>
      {bg && (
        <div className="hx-band-bg" aria-hidden="true">
          {bg}
        </div>
      )}
      <div className="hx-wrap">{children}</div>
      <motion.div className="hx-band-dim" style={{ opacity: dim }} aria-hidden="true" />
    </motion.section>
  );
}
