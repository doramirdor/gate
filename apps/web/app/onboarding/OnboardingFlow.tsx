"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DOMAIN, BRAND_NAME, profileUrl } from "@shared/brand";
import {
  DEFAULT_VISIBILITY,
  SECTION_HINTS,
  SECTION_KEYS,
  SECTION_LABELS,
  isSectionKey,
  type SectionKey,
  type Sections,
  type Visibility,
} from "@shared/profile";
import { checkHandle, claimAccount } from "@/app/actions";
import { Button, Card, Input, Label, Mono, Textarea, cx } from "@/components/ui";

// ---------------------------------------------------------------------------
// Local state shapes
// ---------------------------------------------------------------------------

type Draft = Record<SectionKey, { content: string; visibility: Visibility }>;

function emptyDraft(): Draft {
  const draft = {} as Draft;
  for (const key of SECTION_KEYS) {
    draft[key] = { content: "", visibility: DEFAULT_VISIBILITY[key] };
  }
  return draft;
}

function draftFromSections(sections: Sections): Draft {
  const draft = emptyDraft();
  for (const [key, value] of Object.entries(sections)) {
    if (!isSectionKey(key) || !value) continue;
    draft[key] = {
      content: typeof value.content === "string" ? value.content : "",
      visibility: value.visibility ?? DEFAULT_VISIBILITY[key],
    };
  }
  return draft;
}

function draftToSections(draft: Draft): Sections {
  const out: Sections = {};
  for (const key of SECTION_KEYS) {
    if (draft[key].content.trim()) {
      out[key] = { content: draft[key].content, visibility: draft[key].visibility };
    }
  }
  return out;
}

/** Accept either { sections: {...} } or a bare sections object from the API. */
function parseStructured(payload: unknown): Sections {
  const source =
    payload && typeof payload === "object" && "sections" in payload
      ? (payload as { sections: unknown }).sections
      : payload;
  const out: Sections = {};
  if (!source || typeof source !== "object") return out;
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (!isSectionKey(key)) continue;
    if (typeof value === "string" && value.trim()) {
      out[key] = { content: value, visibility: DEFAULT_VISIBILITY[key] };
    } else if (value && typeof value === "object") {
      const section = value as { content?: unknown; visibility?: unknown };
      if (typeof section.content !== "string" || !section.content.trim()) continue;
      const visibility =
        section.visibility === "public" ||
        section.visibility === "link" ||
        section.visibility === "private"
          ? section.visibility
          : DEFAULT_VISIBILITY[key];
      out[key] = { content: section.content, visibility };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

const STEP_LABELS = ["Handle", "Paste", "Review", "Live"] as const;

function Progress({ step }: { step: number }) {
  return (
    <ol className="mb-10 flex items-center gap-3 font-mono text-xs">
      {STEP_LABELS.map((label, i) => (
        <li key={label} className="flex items-center gap-3">
          {i > 0 ? <span className="text-ink-muted/60">-</span> : null}
          <span className={i + 1 === step ? "text-ink" : "text-ink-muted"}>
            {String(i + 1).padStart(2, "0")} {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function BackLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-ink-muted transition-colors hover:text-ink"
    >
      &larr; {children}
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={cx(
        "h-3 w-3 shrink-0 text-ink-muted transition-transform",
        open && "rotate-90",
      )}
      aria-hidden="true"
    >
      <path
        d="M4 2.5 8 6l-4 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      type="button"
      className="h-8 shrink-0 px-3 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <span className="text-success">Copied</span> : (label ?? "Copy")}
    </Button>
  );
}

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string }> = [
  { value: "public", label: "Public" },
  { value: "link", label: "Link only" },
  { value: "private", label: "Private" },
];

const TEMPLATES: Array<{ id: string; label: string; sections: Sections }> = [
  {
    id: "freelancer",
    label: "Freelancer",
    sections: {
      identity: { content: "Freelance professional. Edit this with your name, specialty, and location.", visibility: "public" },
      scheduling: { content: "Available weekdays. Prefer async over calls. Timezone: edit me.", visibility: "link" },
      budget: { content: "Approve routine expenses under $50. Ask before anything higher.", visibility: "private" },
      comms: { content: "Professional but casual. First-name basis. Email preferred.", visibility: "link" },
    },
  },
  {
    id: "developer",
    label: "Developer",
    sections: {
      identity: { content: "Software developer. Edit with your name and stack.", visibility: "public" },
      scheduling: { content: "Flexible hours. Deep-work blocks in the morning. Async first.", visibility: "link" },
      budget: { content: "Approve infra and tooling costs under $20. Escalate everything else.", visibility: "private" },
      comms: { content: "Direct and technical. Skip pleasantries. Code snippets welcome.", visibility: "link" },
      custom: { content: "Preferred stack, editors, and conventions go here.", visibility: "link" },
    },
  },
  {
    id: "executive",
    label: "Executive",
    sections: {
      identity: { content: "Executive. Edit with your name, title, and company.", visibility: "public" },
      scheduling: { content: "Packed calendar. Only book confirmed open slots. 30-min meetings max.", visibility: "link" },
      budget: { content: "Approve routine expenses under $200. Escalate anything else.", visibility: "private" },
      comms: { content: "Concise and professional. Lead with the decision, not the context.", visibility: "link" },
    },
  },
];

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

type HandleStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "unavailable"; error: string };

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<HandleStatus>({ kind: "idle" });
  const checkSeq = useRef(0);

  // Step 2
  const [pasted, setPasted] = useState("");
  const [organizing, setOrganizing] = useState(false);
  const [organizeError, setOrganizeError] = useState<string | null>(null);

  // Step 3
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [openKeys, setOpenKeys] = useState<Set<SectionKey>>(
    () => new Set<SectionKey>(["identity"]),
  );
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Step 4
  const [token, setToken] = useState("");

  useEffect(() => {
    const value = handle.trim();
    if (!value) {
      setStatus({ kind: "idle" });
      return;
    }
    setStatus({ kind: "checking" });
    const seq = ++checkSeq.current;
    const timer = setTimeout(async () => {
      const result = await checkHandle(value);
      if (seq !== checkSeq.current) return; // stale response
      if (result.available) {
        setStatus({ kind: "available" });
      } else {
        setStatus({
          kind: "unavailable",
          error: result.error ?? "That one is taken.",
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [handle]);

  function arriveAtReview(sections: Sections) {
    const next = draftFromSections(sections);
    setDraft(next);
    const open = new Set<SectionKey>(
      SECTION_KEYS.filter((key) => next[key].content.trim()),
    );
    if (open.size === 0) open.add("identity");
    setOpenKeys(open);
    setClaimError(null);
    setStep(3);
  }

  async function organize() {
    setOrganizing(true);
    setOrganizeError(null);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasted }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          data && typeof data === "object" && typeof data.error === "string"
            ? data.error
            : "Could not organize that. You can skip and start empty.";
        setOrganizeError(message);
        return;
      }
      arriveAtReview(parseStructured(data));
    } catch {
      setOrganizeError("Something went wrong. You can skip and start empty.");
    } finally {
      setOrganizing(false);
    }
  }

  async function claim() {
    setClaiming(true);
    setClaimError(null);
    const result = await claimAccount(handle.trim(), draftToSections(draft));
    setClaiming(false);
    if (!result.ok) {
      if (result.error.toLowerCase().includes("taken")) {
        // Handle race - back to step 1 with the message.
        setStatus({ kind: "unavailable", error: result.error });
        setStep(1);
      } else {
        setClaimError(result.error);
      }
      return;
    }
    setToken(result.token);
    setStep(4);
  }

  const cleanHandle = handle.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const mcpUrl = `${supabaseUrl}/functions/v1/mcp/${cleanHandle}`;
  const pageUrl = profileUrl(cleanHandle);
  const desktopConfig = JSON.stringify(
    {
      mcpServers: {
        [BRAND_NAME.toLowerCase()]: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            mcpUrl,
            "--header",
            `Authorization: Bearer ${token}`,
          ],
        },
      },
    },
    null,
    2,
  );

  return (
    <div>
      <Progress step={step} />

      {/* ----------------------------------------------------- Step 1 */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Pick your handle
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              This becomes the link your agents carry. Short and recognizable
              works best.
            </p>
          </div>
          <div>
            <div className="flex h-14 items-center rounded-xl border border-line bg-surface px-4 focus-within:border-ink-muted">
              <span className="shrink-0 font-mono text-base text-ink-muted">
                {DOMAIN}/
              </span>
              <input
                autoFocus
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="you"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Handle"
                className="h-full w-full bg-transparent font-mono text-base text-ink placeholder:text-ink-muted/60 focus:outline-none"
              />
            </div>
            <p className="mt-2 min-h-5 text-sm" aria-live="polite">
              {status.kind === "checking" && (
                <span className="text-ink-muted">Checking…</span>
              )}
              {status.kind === "available" && (
                <span className="text-success">Yours if you want it.</span>
              )}
              {status.kind === "unavailable" && (
                <span className="text-danger">{status.error}</span>
              )}
            </p>
          </div>
          <Button
            type="button"
            disabled={status.kind !== "available"}
            onClick={() => setStep(2)}
          >
            Continue
          </Button>
        </div>
      )}

      {/* ----------------------------------------------------- Step 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Bring what you already have
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Start from a template, paste something in, or begin empty. You
              can edit everything before anything goes live.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Start from a template</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant="ghost"
                  onClick={() => arriveAtReview(t.sections)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-muted">or paste your own</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div>
            <Label htmlFor="paste-anything">Paste anything about yourself</Label>
            <Textarea
              id="paste-anything"
              rows={10}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Drop it in raw - formatting does not matter."
            />
            <p className="mt-2 text-sm text-ink-muted">
              An old bio, your OpenClaw profile file, notes from your other
              assistants - anything. It gets organized into sections you can
              edit.
            </p>
          </div>
          {organizeError && <p className="text-sm text-danger">{organizeError}</p>}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={organize}
              disabled={organizing || !pasted.trim()}
            >
              {organizing ? "Reading…" : "Organize it"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={organizing}
              onClick={() => arriveAtReview({})}
            >
              Skip, start empty
            </Button>
          </div>
          <BackLink onClick={() => setStep(1)}>Change handle</BackLink>
        </div>
      )}

      {/* ----------------------------------------------------- Step 3 */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Review your sections
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Each section has its own reach. Empty sections are never served.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 text-sm">
            <ul className="space-y-1 text-ink-muted">
              <li>
                <span className="font-medium text-ink">Public</span> - anyone,
                including your page.
              </li>
              <li>
                <span className="font-medium text-ink">Link only</span> - any
                agent holding your link.
              </li>
              <li>
                <span className="font-medium text-ink">Private</span> - only
                tokens you scope to it.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            {SECTION_KEYS.map((key) => {
              const open = openKeys.has(key);
              const filled = Boolean(draft[key].content.trim());
              return (
                <div key={key} className="rounded-xl border border-line bg-surface">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenKeys((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    aria-expanded={open}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
                  >
                    <Chevron open={open} />
                    <span className="text-sm font-medium text-ink">
                      {SECTION_LABELS[key]}
                    </span>
                    {filled && !open ? (
                      <span className="ml-auto text-xs text-ink-muted">
                        Has content
                      </span>
                    ) : null}
                  </button>
                  {open && (
                    <div className="space-y-3 border-t border-line px-4 py-4">
                      <p className="text-xs text-ink-muted">{SECTION_HINTS[key]}</p>
                      <Textarea
                        rows={4}
                        value={draft[key].content}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], content: e.target.value },
                          }))
                        }
                        aria-label={`${SECTION_LABELS[key]} content`}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-muted">Who gets it</span>
                        <select
                          value={draft[key].visibility}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                visibility: e.target.value as Visibility,
                              },
                            }))
                          }
                          aria-label={`${SECTION_LABELS[key]} reach`}
                          className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-ink-muted focus:outline-none"
                        >
                          {VISIBILITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {claimError && <p className="text-sm text-danger">{claimError}</p>}
          <div className="flex items-center justify-between">
            <BackLink onClick={() => setStep(2)}>Back</BackLink>
            <Button type="button" onClick={claim} disabled={claiming}>
              {claiming ? "Claiming…" : `Claim ${DOMAIN}/${cleanHandle}`}
            </Button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- Step 4 */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your link is live.
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Hand these to your agents. They read what you allow and ask you
              first - prompt-based guardrails are suggestions, the gate is a
              wall.
            </p>
          </div>

          <Card className="space-y-3 p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
              Your page
            </p>
            <div className="flex items-center justify-between gap-3">
              <a
                href={pageUrl}
                className="min-w-0"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Mono>{pageUrl}</Mono>
              </a>
              <CopyButton value={pageUrl} />
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
              MCP endpoint + token
            </p>
            <div className="flex items-center justify-between gap-3">
              <Mono className="min-w-0">{mcpUrl}</Mono>
              <CopyButton value={mcpUrl} />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-ink-muted">Bearer token</p>
              <div className="flex items-center justify-between gap-3">
                <Mono className="min-w-0">{token}</Mono>
                <CopyButton value={token} />
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                Claude Desktop
              </p>
              <CopyButton value={desktopConfig} />
            </div>
            <p className="text-xs text-ink-muted">
              Add to{" "}
              <code className="font-mono">claude_desktop_config.json</code>:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-xs leading-relaxed text-ink">
              {desktopConfig}
            </pre>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => router.push("/editor")}>
              Open your editor
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/${cleanHandle}`)}
            >
              View your page
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
