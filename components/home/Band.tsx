"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * A full-width section with its own ground, faded in over the foot of the one before it. As the next band comes
 * up over it, this one darkens, so the page reads in layers.
 */
export function Band({ className, labelledBy, bg, children }: { className: string; labelledBy: string; bg?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // 0 while the band's foot is still below the window; 1 once it has scrolled a window's height past.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["end end", "end start"] });
  const dim = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 0.5]);

  return (
    <motion.section ref={ref} className={`hx-band ${className}`} aria-labelledby={labelledBy}>
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
