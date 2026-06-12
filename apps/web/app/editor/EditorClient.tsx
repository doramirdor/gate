"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
} from "react";
import { saveSections } from "@/app/actions";
import { markdownToHtml } from "@/lib/markdown";
import { Button, Card, Textarea, cx } from "@/components/ui";
import { CONTEXT_FOOTER } from "@shared/brand";
import {
  DEFAULT_VISIBILITY,
  SECTION_HINTS,
  SECTION_KEYS,
  SECTION_LABELS,
  permittedSectionKeys,
  renderProfileMarkdown,
  type Section,
  type SectionKey,
  type Sections,
  type Visibility,
} from "@shared/profile";

/* Reach as signal strength: public broadcasts wide, private stays contained.
   level drives the meter; the blurb is the one-line consequence. */
const REACH: Record<
  Visibility,
  { level: 1 | 2 | 3; label: string; blurb: string }
> = {
  public: {
    level: 3,
    label: "Public",
    blurb: "Shown on your page and served to any agent.",
  },
  link: {
    level: 2,
    label: "Link only",
    blurb: "Served to any agent holding your link.",
  },
  private: {
    level: 1,
    label: "Private",
    blurb: "Served only to tokens scoped to this section.",
  },
};

const REACH_ORDER: Visibility[] = ["public", "link", "private"];

type FullSections = Record<SectionKey, Section>;

function initSections(initial: Sections): FullSections {
  const out = {} as FullSections;
  for (const key of SECTION_KEYS) {
    out[key] = initial[key] ?? {
      content: "",
      visibility: DEFAULT_VISIBILITY[key],
    };
  }
  return out;
}

/* ---- Icons (16px, stroke = currentColor) ---- */

function EyeIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M1.5 8S3.9 3.5 8 3.5 14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function LinkIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6.4 9.6 9.6 6.4M7 4.2l.7-.7a2.7 2.7 0 0 1 3.8 3.8l-.7.7M9 11.8l-.7.7a2.7 2.7 0 0 1-3.8-3.8l.7-.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <rect
        x="3.5"
        y="7"
        width="9"
        height="6"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

const REACH_ICON: Record<Visibility, (p: ComponentProps<"svg">) => JSX.Element> =
  {
    public: EyeIcon,
    link: LinkIcon,
    private: LockIcon,
  };

/* Signal-strength meter: three bars, lit up to `level`. */
function ReachMeter({ level }: { level: 1 | 2 | 3 }) {
  const heights = [5, 8, 11];
  return (
    <span
      className="inline-flex items-end gap-[2px]"
      style={{ height: 11 }}
      aria-hidden="true"
    >
      {heights.map((h, i) => {
        const lit = i < level;
        return (
          <span
            key={i}
            className="ed-bar w-[3px] rounded-[1px] bg-current"
            style={{ height: lit ? h : 4, opacity: lit ? 1 : 0.25 }}
          />
        );
      })}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cx(
        "h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200",
        open && "rotate-90",
      )}
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* The reach control: the core decision, surfaced as three glanceable stops. */
function ReachControl({
  value,
  onChange,
  labelledBy,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  labelledBy: string;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        className="grid grid-cols-3 gap-1.5"
      >
        {REACH_ORDER.map((v) => {
          const reach = REACH[v];
          const Icon = REACH_ICON[v];
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(v)}
              className={cx(
                "flex flex-col gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-accent/50 bg-accent/10"
                  : "border-line bg-surface-2 hover:border-ink-muted/40",
              )}
            >
              <span
                className={cx(
                  "flex items-center justify-between",
                  active ? "text-accent" : "text-ink-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                <ReachMeter level={reach.level} />
              </span>
              <span
                className={cx(
                  "text-xs font-medium",
                  active ? "text-ink" : "text-ink-muted",
                )}
              >
                {reach.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        {REACH[value].blurb}
      </p>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 rounded-lg border border-line bg-surface-2 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-surface text-ink"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EditorClient({
  handle,
  initialSections,
}: {
  handle: string;
  initialSections: Sections;
}) {
  const [sections, setSections] = useState<FullSections>(() =>
    initSections(initialSections),
  );
  const [open, setOpen] = useState<Record<SectionKey, boolean>>(() => {
    const out = {} as Record<SectionKey, boolean>;
    for (const key of SECTION_KEYS) {
      out[key] = Boolean(initialSections[key]?.content?.trim());
    }
    return out;
  });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const savedTimer = useRef<number | undefined>(undefined);

  const [audience, setAudience] = useState<"default" | "all">("default");
  const [renderMode, setRenderMode] = useState<"rendered" | "raw">("rendered");

  useEffect(() => {
    return () => window.clearTimeout(savedTimer.current);
  }, []);

  function updateSection(key: SectionKey, patch: Partial<Section>) {
    setSections((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setDirty(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveSections(sections);
      if (result.ok) {
        setDirty(false);
        setShowSaved(true);
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setShowSaved(false), 2000);
      } else {
        setError(result.error);
      }
    });
  }

  // The exact sections this audience's token would be served — the live link
  // between the ledger on the left and the transmission on the right.
  const previewKeys = useMemo(() => {
    const scopes =
      audience === "default"
        ? ["public"]
        : (SECTION_KEYS as unknown as string[]);
    return permittedSectionKeys(sections, scopes);
  }, [audience, sections]);

  const previewMarkdown = useMemo(
    () => renderProfileMarkdown(handle, sections, previewKeys),
    [handle, sections, previewKeys],
  );

  const previewHtml = useMemo(
    () => markdownToHtml(previewMarkdown),
    [previewMarkdown],
  );

  const filledCount = SECTION_KEYS.filter((k) =>
    sections[k].content.trim(),
  ).length;

  return (
    <div className="grid gap-x-8 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {/* Editing column: the context ledger */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="text-sm font-semibold text-ink">Your context</h2>
          <div
            className="hidden items-center gap-3.5 text-[11px] text-ink-muted sm:flex"
            aria-hidden="true"
          >
            {REACH_ORDER.map((v) => (
              <span key={v} className="inline-flex items-center gap-1.5">
                <ReachMeter level={REACH[v].level} />
                {REACH[v].label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {SECTION_KEYS.map((key, i) => {
            const section = sections[key];
            const isOpen = open[key];
            const reach = REACH[section.visibility];
            const hasContent = Boolean(section.content.trim());
            const live = previewKeys.includes(key);
            const excluded = hasContent && !live;
            const dotTitle = live
              ? "Transmitting to this audience"
              : excluded
                ? "Hidden from this audience"
                : "No content yet";
            const headingId = `sec-${key}`;
            return (
              <div
                key={key}
                className={cx(
                  "transition-opacity",
                  i > 0 && "border-t border-line",
                  excluded && "opacity-60",
                )}
              >
                <button
                  type="button"
                  id={headingId}
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpen((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2"
                >
                  <span
                    title={dotTitle}
                    className={cx(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      live
                        ? "bg-success"
                        : excluded
                          ? "bg-ink-muted"
                          : "border border-line",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-ink">
                      {SECTION_LABELS[key]}
                    </span>
                    {excluded ? (
                      <span className="ml-2 text-[11px] text-ink-muted">
                        hidden in this view
                      </span>
                    ) : !hasContent ? (
                      <span className="ml-2 text-[11px] text-ink-muted">
                        empty
                      </span>
                    ) : null}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted">
                    <ReachMeter level={reach.level} />
                    {reach.label}
                  </span>
                  <Chevron open={isOpen} />
                </button>

                {isOpen ? (
                  <div className="ed-reveal space-y-4 border-t border-line bg-surface-2/40 px-5 py-5">
                    <Textarea
                      rows={6}
                      value={section.content}
                      placeholder={SECTION_HINTS[key]}
                      aria-label={`${SECTION_LABELS[key]} content`}
                      onChange={(e) =>
                        updateSection(key, { content: e.target.value })
                      }
                    />
                    <ReachControl
                      value={section.visibility}
                      labelledBy={headingId}
                      onChange={(visibility) =>
                        updateSection(key, { visibility })
                      }
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 z-10 mt-5 flex items-center gap-3 border-t border-line bg-bg py-4">
          <Button onClick={handleSave} disabled={!dirty || isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
          {dirty && !isPending ? (
            <span className="text-xs text-ink-muted">Unsaved changes</span>
          ) : null}
          <span
            aria-live="polite"
            className={cx(
              "inline-flex items-center gap-1.5 text-sm text-success transition-opacity duration-500",
              showSaved ? "opacity-100" : "opacity-0",
            )}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path
                d="M3.5 8.5l3 3 6-6.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Saved
          </span>
          {error ? (
            <span className="text-sm text-danger" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      </div>

      {/* Preview column: the transmission */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/50 px-5 py-3.5">
            <span className="inline-flex items-center gap-2">
              <span className="ed-live h-1.5 w-1.5 rounded-full bg-success" />
              <h2 className="text-sm font-semibold text-ink">
                What agents receive
              </h2>
            </span>
            <Segmented
              label="Preview format"
              value={renderMode}
              onChange={setRenderMode}
              options={[
                { value: "rendered", label: "Rendered" },
                { value: "raw", label: "Raw" },
              ]}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <Segmented
              label="Audience"
              value={audience}
              onChange={setAudience}
              options={[
                { value: "default", label: "Default token" },
                { value: "all", label: "Everything" },
              ]}
            />
            <span className="font-mono text-[11px] text-ink-muted">
              {previewKeys.length}/{filledCount || 0} sections
            </span>
          </div>

          <div className="px-5 py-5">
            {renderMode === "rendered" ? (
              <div
                className="prose-profile text-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink">
                {previewMarkdown}
              </pre>
            )}
            <p className="mt-6 border-t border-line pt-3 font-mono text-xs text-ink-muted">
              - {CONTEXT_FOOTER}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
