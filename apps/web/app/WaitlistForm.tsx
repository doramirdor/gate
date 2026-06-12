"use client";

import { useState, useTransition } from "react";
import { joinWaitlist } from "./actions";

const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.12)";
const WHITE = "#ffffff";
const GREEN_TX = "#1a7f55";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="text-[15px] font-medium" style={{ color: GREEN_TX }}>
        You are on the list. We will email you when agent setup is ready.
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await joinWaitlist(email);
          if (result.ok) setDone(true);
          else setError(result.error);
        });
      }}
      className="flex w-full max-w-md flex-col gap-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
          className="h-12 flex-1 rounded-full px-5 text-[15px] outline-none"
          style={{
            background: WHITE,
            color: INK,
            border: `1px solid ${LINE}`,
          }}
        />
        <button
          type="submit"
          disabled={pending}
          className="lp-press inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-medium disabled:opacity-60"
          style={{ background: INK, color: WHITE }}
        >
          {pending ? "Adding…" : "Get early access"}
        </button>
      </div>
      {error ? (
        <span className="text-sm" style={{ color: "#c0362c" }}>
          {error}
        </span>
      ) : (
        <span className="text-sm" style={{ color: MUTE }}>
          Or open the editor and go live in two minutes.
        </span>
      )}
    </form>
  );
}
