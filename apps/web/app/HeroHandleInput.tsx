"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DOMAIN } from "@shared/brand";
import { checkHandle } from "@/app/actions";

const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.09)";
const WHITE = "#ffffff";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "unavailable"; error: string };

export function HeroHandleInput() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const seq = useRef(0);

  useEffect(() => {
    const value = handle.trim();
    if (!value) {
      setStatus({ kind: "idle" });
      return;
    }
    setStatus({ kind: "checking" });
    const current = ++seq.current;
    const timer = setTimeout(async () => {
      const result = await checkHandle(value);
      if (current !== seq.current) return;
      if (result.available) {
        setStatus({ kind: "available" });
      } else {
        setStatus({ kind: "unavailable", error: result.error ?? "Taken." });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [handle]);

  return (
    <div className="mx-auto w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (status.kind === "available") router.push("/login");
        }}
        className="flex h-14 items-center rounded-full"
        style={{ background: WHITE, border: `1.5px solid ${LINE}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <span
          className="shrink-0 pl-5 text-[15px]"
          style={{ color: MUTE, fontFamily: "var(--font-jetbrains), monospace" }}
        >
          {DOMAIN}/
        </span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          placeholder="you"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Handle"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-muted/40 focus:outline-none"
          style={{ color: INK, fontFamily: "var(--font-jetbrains), monospace" }}
        />
        <button
          type="submit"
          disabled={status.kind !== "available"}
          className="lp-press mr-1.5 inline-flex h-10 items-center rounded-full px-5 text-[14px] font-semibold transition-opacity disabled:opacity-30"
          style={{ background: INK, color: WHITE }}
        >
          Claim
        </button>
      </form>
      <p className="mt-2.5 min-h-5 text-center text-sm" aria-live="polite">
        {status.kind === "checking" && (
          <span style={{ color: MUTE }}>Checking...</span>
        )}
        {status.kind === "available" && (
          <span style={{ color: "#1a7f55" }}>Yours if you want it.</span>
        )}
        {status.kind === "unavailable" && (
          <span style={{ color: "#c0362c" }}>{status.error}</span>
        )}
      </p>
    </div>
  );
}
