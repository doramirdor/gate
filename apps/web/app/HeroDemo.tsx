"use client";

import { useEffect, useRef, useState } from "react";

const LINE = "rgba(0,0,0,0.09)";

/**
 * Hero product demo — the Remotion-rendered walkthrough (claim a handle → fill a
 * profile → an agent reads scoped context, asks before spending, acts on
 * approval). Autoplays muted and loops like a screen recording; pauses when
 * scrolled out of view; falls back to a static poster under reduced-motion.
 *
 * Assets live in /public/demo (webm preferred, mp4 fallback, jpg poster).
 */
export function HeroDemo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  // Only play while visible — saves battery/CPU when the hero is scrolled past.
  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);

  const frame: React.CSSProperties = {
    width: "100%",
    aspectRatio: "16 / 9",
    display: "block",
    borderRadius: 16,
    border: `1px solid ${LINE}`,
    boxShadow: "0 24px 60px rgba(0,0,0,0.10)",
    background: "#ffffff",
  };

  if (reduced) {
    return (
      <img
        src="/demo/poster.jpg"
        alt="Gate: a profile of preferences on the left, an agent's approval request on the right."
        style={frame}
      />
    );
  }

  return (
    <video
      ref={ref}
      style={frame}
      poster="/demo/poster.jpg"
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-label="Walkthrough: claiming a Gate handle, filling a profile, and an AI agent reading scoped context then asking for approval before spending."
    >
      <source src="/demo/gate-demo.webm" type="video/webm" />
      <source src="/demo/gate-demo.mp4" type="video/mp4" />
    </video>
  );
}
