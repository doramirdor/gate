"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  alwaysAllowApproval,
  resolveApproval,
} from "@/app/actions";
import { Badge, Button, Card, Mono } from "@/components/ui";

export type ApprovalRow = {
  id: string;
  action_desc: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
  status: "pending" | "approved" | "denied" | "expired";
  ts: string;
  resolved_ts: string | null;
  agent_ua: string | null;
};

/** Fixed locale AND time zone so SSR and hydration render the same string. */
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

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null) return "";
  const money = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${money} ${currency}` : money;
}

const RESOLVED_TONE = {
  approved: "green",
  denied: "red",
  expired: "red",
  pending: "amber",
} as const;

const RESOLVED_LABEL = {
  approved: "Approved",
  denied: "Denied",
  expired: "Expired",
  pending: "Pending",
} as const;

// ---------------------------------------------------------------------------

function PendingCard({ row }: { row: ApprovalRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const amount = formatAmount(row.amount, row.currency);
  const category = row.category?.trim() || null;

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Card className="border-accent/40">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="amber">Pending</Badge>
              {category ? <Badge>{category}</Badge> : null}
            </div>
            <p className="text-sm font-medium text-ink">{row.action_desc}</p>
            {amount ? (
              <p className="font-mono text-sm text-ink">{amount}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-xs text-ink-muted">
              {formatTs(row.ts)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {row.agent_ua ? (
            <span className="text-xs text-ink-muted">
              from <Mono>{row.agent_ua}</Mono>
            </span>
          ) : (
            <span className="text-xs text-ink-muted">from an agent</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="accent"
            className="h-9 px-4 text-sm"
            disabled={isPending}
            onClick={() => run(() => resolveApproval(row.id, "approved"))}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="danger"
            className="h-9 px-4 text-sm"
            disabled={isPending}
            onClick={() => run(() => resolveApproval(row.id, "denied"))}
          >
            Deny
          </Button>
          {category ? (
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-4 text-sm"
              disabled={isPending}
              onClick={() => run(() => alwaysAllowApproval(row.id))}
            >
              Always allow {category}
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Card>
  );
}

function ResolvedItem({ row }: { row: ApprovalRow }) {
  const amount = formatAmount(row.amount, row.currency);
  const category = row.category?.trim() || null;
  const tone = RESOLVED_TONE[row.status];
  const when = row.resolved_ts ?? row.ts;

  return (
    <li className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{RESOLVED_LABEL[row.status]}</Badge>
          {category ? <Badge>{category}</Badge> : null}
        </div>
        <p className="text-sm text-ink">{row.action_desc}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          {amount ? <span className="font-mono">{amount}</span> : null}
          {row.agent_ua ? <Mono>{row.agent_ua}</Mono> : null}
        </div>
      </div>
      <div className="shrink-0 font-mono text-xs text-ink-muted">
        {formatTs(when)}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------

export function InboxClient({
  pending,
  resolved,
}: {
  pending: ApprovalRow[];
  resolved: ApprovalRow[];
}) {
  if (pending.length === 0 && resolved.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-muted">
          Gate is standing by - no agent has asked for anything yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Waiting on you
        </h2>
        {pending.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-muted">
              Nothing waiting - every request has been handled.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pending.map((row) => (
              <PendingCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Resolved
          </h2>
          <Card>
            <ul>
              {resolved.map((row) => (
                <ResolvedItem key={row.id} row={row} />
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
