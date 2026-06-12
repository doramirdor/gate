"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function callbackUrl() {
    return (
      window.location.origin +
      "/auth/callback?next=" +
      encodeURIComponent(next || "")
    );
  }

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setPending(false);
    if (otpError) {
      setError("Could not send the sign-in link. Check the address and try again.");
      return;
    }
    setSent(true);
  }

  async function continueWithGoogle() {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (oauthError) {
      setPending(false);
      setError("Could not reach Google. Try again.");
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 px-4 py-5 text-center">
        <p className="text-sm font-medium text-success">Sign-in link sent</p>
        <p className="mt-1 text-sm text-ink-muted">
          Check your email - the sign-in link gets you in.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={sendLink} className="space-y-4">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send sign-in link"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs uppercase tracking-widest text-ink-muted">
          or
        </span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={pending}
        onClick={continueWithGoogle}
      >
        Continue with Google
      </Button>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
