import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { InboxClient, type ApprovalRow } from "./InboxClient";

export const metadata: Metadata = { title: "Inbox" };

/** Pending approvals expire 15 minutes after they were raised. */
const PENDING_TTL_MS = 15 * 60 * 1000;

export default async function InboxPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/inbox");

  const { data: account } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  if (!account) redirect("/onboarding");

  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, action_desc, amount, currency, category, status, ts, resolved_ts, agent_ua")
    .eq("user_id", user.id)
    .order("ts", { ascending: false });

  const rows = (approvals ?? []) as ApprovalRow[];
  const now = Date.now();

  // A row is live only while still pending AND inside its 15-minute window.
  // Everything else - resolved, or pending-but-stale - lands in history. The
  // MCP function flips stale rows to "expired" server-side on its next poll;
  // here we just present them that way.
  const pending: ApprovalRow[] = [];
  const resolved: ApprovalRow[] = [];
  for (const row of rows) {
    const stale = now - new Date(row.ts).getTime() > PENDING_TTL_MS;
    if (row.status === "pending" && !stale) {
      pending.push(row);
    } else if (row.status === "pending" && stale) {
      resolved.push({ ...row, status: "expired" });
    } else {
      resolved.push(row);
    }
  }

  return (
    <AppShell handle={account.handle}>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Live requests wait here until you decide. Nothing happens until you
          tap.
        </p>
      </div>
      <InboxClient pending={pending} resolved={resolved} />
    </AppShell>
  );
}
