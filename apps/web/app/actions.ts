"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateHandle } from "@/lib/handles";
import {
  DEFAULT_VISIBILITY,
  isSectionKey,
  SECTION_KEYS,
  type SectionKey,
  type Sections,
  type Visibility,
} from "@shared/profile";

const MAX_SECTION_CHARS = 20_000;
const VISIBILITIES: Visibility[] = ["public", "link", "private"];
const VALID_SCOPES = new Set<string>([
  "public",
  "approvals",
  ...SECTION_KEYS,
  ...SECTION_KEYS.map((k) => `write:${k}`),
]);

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

/** Drop unknown keys, clamp content, default bad visibilities. */
function sanitizeSections(input: unknown): Sections {
  const clean: Sections = {};
  if (!input || typeof input !== "object") return clean;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isSectionKey(key)) continue;
    if (!value || typeof value !== "object") continue;
    const section = value as { content?: unknown; visibility?: unknown };
    const content =
      typeof section.content === "string"
        ? section.content.slice(0, MAX_SECTION_CHARS)
        : "";
    if (!content.trim()) continue;
    const visibility = VISIBILITIES.includes(section.visibility as Visibility)
      ? (section.visibility as Visibility)
      : DEFAULT_VISIBILITY[key as SectionKey];
    clean[key as SectionKey] = { content, visibility };
  }
  return clean;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export async function checkHandle(
  raw: string,
): Promise<{ available: boolean; error?: string }> {
  const validated = validateHandle(raw);
  if (!validated.ok) return { available: false, error: validated.error };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("handle_available", {
    h: validated.handle,
  });
  if (error) return { available: false, error: "Could not check that handle." };
  return { available: data === true };
}

/** Creates the users row, profile, and default agent token in one go. */
export async function claimAccount(
  rawHandle: string,
  sections: Sections,
): Promise<Result<{ handle: string; token: string }>> {
  const validated = validateHandle(rawHandle);
  if (!validated.ok) return { ok: false, error: validated.error };
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) {
    // The three inserts below are not transactional, so a previous claim may
    // have failed partway. Resume provisioning instead of locking the user
    // out: keep their existing handle, fill in whatever rows are missing.
    const { error: profileErr } = await supabase.from("profiles").upsert(
      { user_id: user.id, sections: sanitizeSections(sections) },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    if (profileErr) return { ok: false, error: "Could not save your sections." };

    const { data: activeToken } = await supabase
      .from("tokens")
      .select("id")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    let tokenId = activeToken?.id;
    if (!tokenId) {
      const { data: created, error: tokenErr } = await supabase
        .from("tokens")
        .insert({ user_id: user.id, scopes: ["public"], label: "Default" })
        .select("id")
        .single();
      if (tokenErr || !created) {
        return { ok: false, error: "Could not create your agent token." };
      }
      tokenId = created.id;
    }
    return { ok: true, handle: existing.handle, token: tokenId };
  }

  const { error: userErr } = await supabase
    .from("users")
    .insert({ id: user.id, handle: validated.handle });
  if (userErr) {
    return {
      ok: false,
      error:
        userErr.code === "23505"
          ? "That handle was just taken."
          : "Could not claim that handle.",
    };
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, sections: sanitizeSections(sections) });
  if (profileErr) return { ok: false, error: "Could not save your sections." };

  const { data: token, error: tokenErr } = await supabase
    .from("tokens")
    .insert({ user_id: user.id, scopes: ["public"], label: "Default" })
    .select("id")
    .single();
  if (tokenErr || !token) {
    return { ok: false, error: "Could not create your agent token." };
  }

  return { ok: true, handle: validated.handle, token: token.id };
}

// ---------------------------------------------------------------------------
// Profile editing
// ---------------------------------------------------------------------------

export async function saveSections(sections: Sections): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { data: account } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, sections: sanitizeSections(sections) });
  if (error) return { ok: false, error: "Could not save." };
  if (account) revalidatePath(`/${account.handle}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export async function createToken(
  label: string,
  scopes: string[],
): Promise<Result<{ token: string }>> {
  const cleanScopes = Array.from(new Set(scopes)).filter((s) =>
    VALID_SCOPES.has(s),
  );
  if (cleanScopes.length === 0) {
    return { ok: false, error: "Pick at least one scope." };
  }
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("tokens")
    .insert({
      user_id: user.id,
      scopes: cleanScopes,
      label: label.trim().slice(0, 80) || null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not create token." };
  revalidatePath("/settings");
  return { ok: true, token: data.id };
}

export async function revokeToken(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id); // RLS restricts to own rows
  if (error) return { ok: false, error: "Could not revoke token." };
  revalidatePath("/settings");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Spend threshold (the one v1 auto-approve dial)
// ---------------------------------------------------------------------------

export async function setSpendThreshold(
  amount: number | null,
): Promise<Result> {
  // Validate before mutating - a bad amount must not wipe the existing rule.
  if (
    amount !== null &&
    (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000)
  ) {
    return { ok: false, error: "Enter an amount between 0 and 1,000,000." };
  }
  const { supabase, user } = await requireUser();
  const { error: deleteErr } = await supabase
    .from("rules")
    .delete()
    .eq("user_id", user.id)
    .eq("rule->>type", "spend_threshold");
  if (deleteErr) return { ok: false, error: "Could not update threshold." };
  if (amount !== null) {
    const { error } = await supabase.from("rules").insert({
      user_id: user.id,
      rule: { type: "spend_threshold", amount, currency: "USD", action: "ask" },
    });
    if (error) return { ok: false, error: "Could not save threshold." };
  }
  revalidatePath("/settings");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Approvals inbox
// ---------------------------------------------------------------------------

/** Approve or deny a pending approval. No-op (with notice) once resolved. */
export async function resolveApproval(
  id: string,
  decision: "approved" | "denied",
): Promise<Result> {
  if (decision !== "approved" && decision !== "denied") {
    return { ok: false, error: "Unknown decision." };
  }
  const { supabase, user } = await requireUser();
  // Resolve idempotently: only act while the row is still pending.
  const { data: row } = await supabase
    .from("approvals")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Approval not found." };
  if (row.status !== "pending") return { ok: false, error: "Already resolved." };

  const { error } = await supabase
    .from("approvals")
    .update({ status: decision, resolved_ts: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending"); // RLS restricts to own rows
  if (error) return { ok: false, error: "Could not update this request." };
  revalidatePath("/inbox");
  return { ok: true };
}

/**
 * Approve a pending request and, when it carries a category, remember that
 * category so future matches auto-approve.
 */
export async function alwaysAllowApproval(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("approvals")
    .select("status, category")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Approval not found." };
  if (row.status !== "pending") return { ok: false, error: "Already resolved." };

  const { error } = await supabase
    .from("approvals")
    .update({ status: "approved", resolved_ts: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending"); // RLS restricts to own rows
  if (error) return { ok: false, error: "Could not update this request." };

  const category = (row.category ?? "").trim();
  if (category) {
    const { error: ruleErr } = await supabase.from("rules").insert({
      user_id: user.id,
      rule: { type: "always_allow", match: { category } },
    });
    if (ruleErr) {
      return { ok: false, error: "Approved, but could not save the allowance." };
    }
  }
  revalidatePath("/inbox");
  revalidatePath("/settings");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Quiet hours
// ---------------------------------------------------------------------------

export async function setQuietHours(input: {
  enabled: boolean;
  start: number;
  end: number;
  tz: string | null;
}): Promise<Result> {
  const { enabled, start, end } = input;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start > 23 ||
    end < 0 ||
    end > 23
  ) {
    return { ok: false, error: "Hours must be whole numbers between 0 and 23." };
  }
  const tz = input.tz?.trim() ? input.tz.trim().slice(0, 64) : null;

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("users")
    .update({
      quiet_hours_enabled: enabled,
      quiet_start: start,
      quiet_end: end,
      tz,
    })
    .eq("id", user.id); // RLS restricts to own row
  if (error) return { ok: false, error: "Could not save quiet hours." };
  revalidatePath("/settings");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Waitlist (coming-soon agent-built setup) - public, no auth
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(email: string): Promise<Result> {
  const clean = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(clean) || clean.length > 200) {
    return { ok: false, error: "Enter a valid email address." };
  }
  // The landing is public, so this runs unauthenticated. The waitlist table
  // has no RLS policies; only the service role may write to it.
  const service = createServiceClient();
  const { error } = await service
    .from("waitlist")
    .insert({ email: clean, source: "landing" });
  // 23505 = unique violation: already on the list, which is a success here.
  if (error && error.code !== "23505") {
    return { ok: false, error: "Could not save that. Please try again." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------

export async function deleteAccount(): Promise<Result> {
  const { supabase, user } = await requireUser();
  const service = createServiceClient();
  // users row cascades to profiles, tokens, rules, reads, approvals.
  const { error: rowErr } = await service.from("users").delete().eq("id", user.id);
  if (rowErr) return { ok: false, error: "Could not delete your data." };
  const { error: authErr } = await service.auth.admin.deleteUser(user.id);
  if (authErr) return { ok: false, error: "Data deleted; sign-in removal failed." };
  await supabase.auth.signOut();
  return { ok: true };
}
