"use client";

import { useState, useTransition } from "react";
import { profileUrl } from "@shared/brand";
import {
  SECTION_KEYS,
  SECTION_LABELS,
  writeScope,
  type SectionKey,
} from "@shared/profile";

const TOKEN_PREFIX = "gk_live_";
import {
  createToken,
  deleteAccount,
  revokeToken,
  setQuietHours,
  setSpendThreshold,
} from "@/app/actions";
import { Badge, Button, Card, Input, Label, Mono, cx } from "@/components/ui";

export type TelegramSettings = { connectCode: string; connected: boolean };
export type QuietHoursSettings = {
  enabled: boolean;
  start: number;
  end: number;
  tz: string | null;
};

export type TokenRow = {
  id: string;
  label: string | null;
  scopes: string[];
  created_at: string;
  revoked_at: string | null;
};

/** Fixed locale AND time zone so SSR and hydration render the same string. */
const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };
  return [copied, copy];
}

function CopyButton({ value }: { value: string }) {
  const [copied, copy] = useCopy();
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-8 shrink-0 px-3 text-xs"
      onClick={() => copy(value)}
    >
      {copied ? <span className="text-success">Copied</span> : "Copy"}
    </Button>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Your agent link
// ---------------------------------------------------------------------------

function LinkRow({ name, value }: { name: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-ink">{name}</div>
      <div className="flex items-center gap-2">
        <Mono className="flex-1 py-2">{value}</Mono>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function AgentLinkCard({ handle }: { handle: string }) {
  const mcpUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/mcp/" + handle;
  return (
    <Card>
      <SectionHeading
        title="Your agent link"
        description="Hand these to the agents you trust. They read what you allow - and ask first for everything else."
      />
      <div className="space-y-4">
        <LinkRow name="Profile link" value={profileUrl(handle)} />
        <LinkRow name="MCP endpoint" value={mcpUrl} />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. Tokens
// ---------------------------------------------------------------------------

/** The two account-wide scopes shown as plain checkboxes. */
const TOP_SCOPES: { value: string; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "approvals", label: "Approvals" },
];

type SectionAccess = "none" | "read" | "write";

/** Read a section's access level out of a flat scopes array. */
function sectionAccess(scopes: string[], key: SectionKey): SectionAccess {
  if (scopes.includes(writeScope(key))) return "write";
  if (scopes.includes(key)) return "read";
  return "none";
}

/** Scopes are stored as raw keys; always display the label (never the raw key). */
function scopeLabel(scope: string): string {
  if (scope === "public") return "Public";
  if (scope === "approvals") return "Approvals";
  if (scope.startsWith("write:")) {
    const key = scope.slice("write:".length) as SectionKey;
    return `${SECTION_LABELS[key] ?? key} (write)`;
  }
  const label = SECTION_LABELS[scope as SectionKey];
  return label ? `${label} (read)` : scope;
}

function TokenListItem({ token }: { token: TokenRow }) {
  const [copied, copy] = useCopy();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const revoked = Boolean(token.revoked_at);

  const onRevoke = () => {
    if (
      !window.confirm(
        "Revoke this token? Agents holding it lose access immediately.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await revokeToken(token.id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cx(
              "text-sm font-medium",
              revoked && "text-ink-muted line-through",
            )}
          >
            {token.label ?? "Untitled"}
          </span>
          {token.scopes.map((scope) => (
            <Badge key={scope}>{scopeLabel(scope)}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => copy(`${TOKEN_PREFIX}${token.id}`)}
            title="Copy token"
            className="min-w-0 text-left"
          >
            <Mono className="cursor-pointer">{TOKEN_PREFIX}{token.id}</Mono>
          </button>
          {copied ? <span className="text-xs text-success">Copied</span> : null}
          <span className="font-mono text-xs text-ink-muted">
            {dateFmt.format(new Date(token.created_at))}
          </span>
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
      <div className="shrink-0">
        {revoked ? (
          <Badge tone="red">Revoked</Badge>
        ) : (
          <Button
            type="button"
            variant="danger"
            className="h-8 px-3 text-xs"
            onClick={onRevoke}
            disabled={isPending}
          >
            {isPending ? "Revoking…" : "Revoke"}
          </Button>
        )}
      </div>
    </li>
  );
}

function NewTokenForm() {
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["public"]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  const toggleScope = (value: string) => {
    setScopes((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  // Cycle one section through None → Read → Write → None. Write implies read,
  // so the two scope strings for a section are mutually exclusive.
  const cycleSection = (key: SectionKey) => {
    setScopes((prev) => {
      const access = sectionAccess(prev, key);
      const without = prev.filter((s) => s !== key && s !== writeScope(key));
      if (access === "none") return [...without, key];
      if (access === "read") return [...without, writeScope(key)];
      return without;
    });
  };

  const onCreate = () => {
    setError(null);
    setNewToken(null);
    startTransition(async () => {
      const result = await createToken(label, scopes);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewToken(result.token);
      setLabel("");
      setScopes(["public"]);
    });
  };

  return (
    <div className="mt-4 space-y-4">
      {newToken ? (
        <Card className="border-success/40 p-4">
          <p className="text-sm font-medium text-success">Token created</p>
          <p className="mt-1 text-sm text-ink-muted">
            Give this to your agent. You can revoke it here any time.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Mono className="flex-1 py-2">{TOKEN_PREFIX}{newToken}</Mono>
            <CopyButton value={`${TOKEN_PREFIX}${newToken}`} />
          </div>
        </Card>
      ) : null}
      <div>
        <Label htmlFor="token-label">Label</Label>
        <Input
          id="token-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Shopping agent"
          maxLength={80}
        />
      </div>
      <div>
        <div className="mb-1.5 text-sm font-medium text-ink">Scopes</div>
        <div className="grid grid-cols-2 gap-2">
          {TOP_SCOPES.map((opt) => (
            <label
              key={opt.value}
              className={cx(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                scopes.includes(opt.value)
                  ? "border-ink-muted bg-surface-2 text-ink"
                  : "border-line text-ink-muted hover:bg-surface-2",
              )}
            >
              <input
                type="checkbox"
                checked={scopes.includes(opt.value)}
                onChange={() => toggleScope(opt.value)}
                className="h-4 w-4 accent-[var(--ink)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Profile sections
          </div>
          {SECTION_KEYS.map((key) => {
            const access = sectionAccess(scopes, key);
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
              >
                <span className="text-sm text-ink">{SECTION_LABELS[key]}</span>
                <button
                  type="button"
                  onClick={() => cycleSection(key)}
                  aria-label={`${SECTION_LABELS[key]} access: ${access}. Tap to change.`}
                  className={cx(
                    "inline-flex h-7 min-w-[5.5rem] items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors",
                    access === "write"
                      ? "border-ink bg-ink text-bg"
                      : access === "read"
                        ? "border-ink-muted bg-surface-2 text-ink"
                        : "border-line text-ink-muted hover:bg-surface-2",
                  )}
                >
                  {access === "none" ? "No access" : access === "read" ? "Read" : "Write"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          {'"public" serves everything marked Public or Link; "approvals" lets the agent ask you for permission. Tap a section to cycle it: No access → Read (unlocks it even when Private) → Write (the agent can edit it too).'}
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        type="button"
        onClick={onCreate}
        disabled={isPending || scopes.length === 0}
      >
        {isPending ? "Creating…" : "Create token"}
      </Button>
    </div>
  );
}

function TokensCard({ tokens }: { tokens: TokenRow[] }) {
  return (
    <Card>
      <SectionHeading
        title="Tokens"
        description="One key per agent. Revoke any of them without touching the rest."
      />
      {tokens.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No tokens yet. Create one below and hand it to your agent.
        </p>
      ) : (
        <ul>
          {tokens.map((token) => (
            <TokenListItem key={token.id} token={token} />
          ))}
        </ul>
      )}
      <div className="mt-6 border-t border-line pt-6">
        <h3 className="text-sm font-semibold">New token</h3>
        <NewTokenForm />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 3. Ask-first threshold
// ---------------------------------------------------------------------------

function ThresholdCard({ initialAmount }: { initialAmount: number | null }) {
  const [value, setValue] = useState(
    initialAmount === null ? "" : String(initialAmount),
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    setError(null);
    setSaved(false);
    const trimmed = value.trim();
    const amount = trimmed === "" ? null : Number(trimmed);
    if (amount !== null && !Number.isFinite(amount)) {
      setError("Enter a number, or leave it empty to always ask.");
      return;
    }
    startTransition(async () => {
      const result = await setSpendThreshold(amount);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <Card>
      <SectionHeading
        title="Ask-first threshold"
        description="Spending under this amount is auto-approved and logged. Everything else asks you first."
      />
      <div className="flex items-end gap-3">
        <div className="w-44">
          <Label htmlFor="spend-threshold">Amount (USD)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">
              $
            </span>
            <Input
              id="spend-threshold"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="pl-7 font-mono"
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="shrink-0"
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
        {saved ? (
          <span className="pb-2.5 text-sm text-success">Saved</span>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Leave it empty to always ask first - every spend waits for your
        approval.
      </p>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 4. Telegram
// ---------------------------------------------------------------------------

function TelegramCard({
  connectCode,
  connected,
}: {
  connectCode: string;
  connected: boolean;
}) {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT;
  const deepLink = bot
    ? `https://t.me/${bot}?start=${connectCode}`
    : `https://t.me/<your-bot>?start=${connectCode}`;

  return (
    <Card>
      <SectionHeading
        title="Telegram"
        description="Get approval requests as a tap on your phone - Approve, Deny, or always allow a category, right from the chat."
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <Badge tone="green">Connected</Badge>
          ) : (
            <Badge>Not connected</Badge>
          )}
        </div>

        {bot ? (
          <div>
            <a href={deepLink} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="ghost">
                {connected ? "Reconnect Telegram" : "Connect Telegram"}
              </Button>
            </a>
            <p className="mt-2 text-xs text-ink-muted">
              Opens the bot in Telegram and links this account. Reconnecting from
              a new chat moves approvals there.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-ink-muted">
              Set <Mono>NEXT_PUBLIC_TELEGRAM_BOT</Mono> to your bot&apos;s
              username to enable one-tap connect. Until then, open this link in
              Telegram by hand:
            </p>
            <Mono className="block py-2">{deepLink}</Mono>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 5. Quiet hours
// ---------------------------------------------------------------------------

function HourInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="w-28">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={23}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono"
      />
    </div>
  );
}

function QuietHoursCard({ initial }: { initial: QuietHoursSettings }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [start, setStart] = useState(String(initial.start));
  const [end, setEnd] = useState(String(initial.end));
  const [tz, setTz] = useState(initial.tz ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    setError(null);
    setSaved(false);
    const startNum = Number(start);
    const endNum = Number(end);
    if (
      !Number.isInteger(startNum) ||
      !Number.isInteger(endNum) ||
      startNum < 0 ||
      startNum > 23 ||
      endNum < 0 ||
      endNum > 23
    ) {
      setError("Hours must be whole numbers between 0 and 23.");
      return;
    }
    startTransition(async () => {
      const result = await setQuietHours({
        enabled,
        start: startNum,
        end: endNum,
        tz: tz.trim() === "" ? null : tz.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <Card>
      <SectionHeading
        title="Quiet hours"
        description="During quiet hours, auto-approved spends are batched into a single 09:00 local digest instead of pinging you one by one. Live approval requests always come through - quiet hours never hold them back."
      />
      <div className="space-y-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-[var(--ink)]"
          />
          <span className="text-sm text-ink">Batch confirmations overnight</span>
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <HourInput
            id="quiet-start"
            label="Start (hour)"
            value={start}
            onChange={setStart}
          />
          <HourInput
            id="quiet-end"
            label="End (hour)"
            value={end}
            onChange={setEnd}
          />
          <div className="w-56">
            <Label htmlFor="quiet-tz">Time zone (optional)</Label>
            <Input
              id="quiet-tz"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder="e.g. America/New_York"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={onSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          {saved ? <span className="text-sm text-success">Saved</span> : null}
        </div>
        <p className="text-xs text-ink-muted">
          Hours are local, 0–23. Start is inclusive, end is exclusive - 22 to 8
          means quiet from 10pm until 8am.
        </p>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 6. Danger zone
// ---------------------------------------------------------------------------

function DangerZoneCard() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (
      !window.confirm(
        "This deletes your link, sections, tokens, and history. No undo.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = "/";
    });
  };

  return (
    <Card className="border-danger/40">
      <SectionHeading
        title="Danger zone"
        description="Removes your link, every section, every token, and your full approval history."
      />
      <Button
        type="button"
        variant="danger"
        onClick={onDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting…" : "Delete account"}
      </Button>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------

export function SettingsClient({
  handle,
  tokens,
  spendThreshold,
  telegram,
  quietHours,
}: {
  handle: string;
  tokens: TokenRow[];
  spendThreshold: number | null;
  telegram: TelegramSettings;
  quietHours: QuietHoursSettings;
}) {
  return (
    <div className="space-y-6">
      <AgentLinkCard handle={handle} />
      <TokensCard tokens={tokens} />
      <ThresholdCard initialAmount={spendThreshold} />
      <TelegramCard
        connectCode={telegram.connectCode}
        connected={telegram.connected}
      />
      <QuietHoursCard initial={quietHours} />
      <DangerZoneCard />
    </div>
  );
}
