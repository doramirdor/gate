import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, Mono } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Log" };

const MAX_ROWS = 200;

/** Fixed locale AND time zone so the rendered string is stable. */
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function formatTs(ts: string): string {
  return `${dateFmt.format(new Date(ts))} UTC`;
}

type Entry = {
  ts: string;
  agent_ua: string | null;
  kind: "read" | "approval";
  detail: string;
  outcome: string;
};

type OutcomeTone = "neutral" | "amber" | "green" | "red";

function outcomeTone(entry: Entry): OutcomeTone {
  if (entry.kind === "read") return "neutral";
  switch (entry.outcome) {
    case "approved":
      return "green";
    case "denied":
    case "expired":
      return "red";
    case "pending":
      return "amber";
    default:
      return "neutral";
  }
}

function outcomeLabel(entry: Entry): string {
  if (entry.kind === "read") return entry.outcome;
  return entry.outcome.charAt(0).toUpperCase() + entry.outcome.slice(1);
}

export default async function LogPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/log");

  const { data: account } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  if (!account) redirect("/onboarding");

  // reads have no user_id - they reference a token. Resolve the user's token
  // ids first, then scope reads to them (RLS also enforces this).
  const { data: tokens } = await supabase
    .from("tokens")
    .select("id")
    .eq("user_id", user.id);
  const tokenIds = (tokens ?? []).map((t: { id: string }) => t.id);

  const readsQuery =
    tokenIds.length > 0
      ? supabase
          .from("reads")
          .select("scope_requested, agent_ua, ts")
          .in("token_id", tokenIds)
          .order("ts", { ascending: false })
          .limit(MAX_ROWS)
      : null;

  const [readsResult, approvalsResult] = await Promise.all([
    readsQuery,
    supabase
      .from("approvals")
      .select("action_desc, status, category, amount, currency, agent_ua, ts")
      .eq("user_id", user.id)
      .order("ts", { ascending: false })
      .limit(MAX_ROWS),
  ]);

  const reads = (readsResult?.data ?? []) as {
    scope_requested: string | null;
    agent_ua: string | null;
    ts: string;
  }[];
  const approvals = (approvalsResult.data ?? []) as {
    action_desc: string;
    status: string;
    category: string | null;
    amount: number | null;
    currency: string | null;
    agent_ua: string | null;
    ts: string;
  }[];

  const entries: Entry[] = [
    ...reads.map((r): Entry => ({
      ts: r.ts,
      agent_ua: r.agent_ua,
      kind: "read",
      detail: r.scope_requested ?? "context",
      outcome: "context served",
    })),
    ...approvals.map((a): Entry => ({
      ts: a.ts,
      agent_ua: a.agent_ua,
      kind: "approval",
      detail: a.action_desc,
      outcome: a.status,
    })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, MAX_ROWS);

  return (
    <AppShell handle={account.handle}>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Log</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every read an agent made and every request it raised - newest first.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            Gate is standing by - no agent activity yet.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-ink-muted">
                <th className="px-5 py-3 font-medium">Timestamp</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Scope / Action</th>
                <th className="px-5 py-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={`${entry.kind}-${entry.ts}-${i}`}
                  className="border-b border-line last:border-b-0"
                >
                  <td className="whitespace-nowrap px-5 py-3 align-top">
                    <span className="font-mono text-xs text-ink-muted">
                      {formatTs(entry.ts)}
                    </span>
                  </td>
                  <td className="px-5 py-3 align-top">
                    {entry.agent_ua ? (
                      <Mono>{entry.agent_ua}</Mono>
                    ) : (
                      <span className="text-xs text-ink-muted">unknown</span>
                    )}
                  </td>
                  <td className="px-5 py-3 align-top text-ink">{entry.detail}</td>
                  <td className="px-5 py-3 align-top">
                    <Badge tone={outcomeTone(entry)}>{outcomeLabel(entry)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AppShell>
  );
}
