// AUTO-GENERATED - edit /lib/profile.ts and run `npm run sync`. Do not edit here.
/**
 * Profile sections: shape, scope rules, and the markdown renderer that
 * defines exactly what agents receive.
 *
 * Shared by the web app (editor preview, public page) and the MCP edge
 * function via a generated mirror in supabase/functions/_shared/.
 * After editing, run `npm run sync`.
 */

export const SECTION_KEYS = [
  "identity",
  "scheduling",
  "dietary",
  "sizes",
  "budget",
  "comms",
  "custom",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/**
 * public  - shown on the public profile page and served to any valid token
 * link    - served to any valid token (holding the gated link is the grant)
 * private - served only to tokens whose scopes name this section explicitly
 */
export type Visibility = "public" | "link" | "private";

export interface Section {
  /** Markdown. */
  content: string;
  visibility: Visibility;
}

export type Sections = Partial<Record<SectionKey, Section>>;

/**
 * UI labels for sections. Note: the `identity` DB key is labeled "About" -
 * UI copy must never use the banned words (see README copy rules).
 */
export const SECTION_LABELS: Record<SectionKey, string> = {
  identity: "About",
  scheduling: "Scheduling",
  dietary: "Dietary",
  sizes: "Sizes",
  budget: "Budget",
  comms: "Communication",
  custom: "Custom",
};

export const SECTION_HINTS: Record<SectionKey, string> = {
  identity: "Name, what you do, where you live, how agents should refer to you.",
  scheduling: "Working hours, timezone, meeting preferences, calendar quirks.",
  dietary: "Allergies, diets, strong dislikes - anything an agent ordering food must know.",
  sizes: "Clothing and shoe sizes, fit preferences.",
  budget: "Spending comfort zones, price ceilings, subscription appetite.",
  comms: "Tone, sign-offs, channels you prefer, people who can always reach you.",
  custom: "Anything else your agents should know.",
};

export const DEFAULT_VISIBILITY: Record<SectionKey, Visibility> = {
  identity: "public",
  scheduling: "link",
  dietary: "link",
  sizes: "link",
  budget: "private",
  comms: "link",
  custom: "link",
};

export function isSectionKey(key: string): key is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(key);
}

/**
 * Per-section write scopes. The read grant for a section is the bare section
 * key (e.g. "budget"); the write grant is "write:<key>" (e.g. "write:budget").
 * Write implies read.
 */
export const WRITE_SCOPE_PREFIX = "write:";

/** The write scope string for a section, e.g. "write:budget". */
export function writeScope(key: SectionKey): string {
  return `${WRITE_SCOPE_PREFIX}${key}`;
}

/** Whether a token's scopes grant write access to a section. */
export function canWriteSection(tokenScopes: string[], key: SectionKey): boolean {
  return tokenScopes.includes(writeScope(key));
}

/** Sections a token may write, in canonical order. */
export function writableSectionKeys(tokenScopes: string[]): SectionKey[] {
  return SECTION_KEYS.filter((key) => canWriteSection(tokenScopes, key));
}

/**
 * Which sections a token may read.
 * - scope "public" grants every section at public or link visibility
 * - a section key in token scopes grants that section at any visibility
 * - a "write:<key>" scope grants read of that section too (write implies read)
 */
export function permittedSectionKeys(
  sections: Sections,
  tokenScopes: string[],
): SectionKey[] {
  return SECTION_KEYS.filter((key) => {
    const section = sections[key];
    if (!section || !section.content?.trim()) return false;
    if (tokenScopes.includes(key)) return true;
    if (canWriteSection(tokenScopes, key)) return true;
    if (tokenScopes.includes("public") && section.visibility !== "private") {
      return true;
    }
    return false;
  });
}

/**
 * Parse get_context's scope argument.
 * "public" / "all" / "" → everything the token permits;
 * otherwise a comma-separated list of section keys.
 */
export function requestedSectionKeys(
  scope: string | undefined,
): SectionKey[] | "all" {
  const s = (scope ?? "public").trim().toLowerCase();
  if (s === "" || s === "public" || s === "all" || s === "*") return "all";
  return s
    .split(",")
    .map((part) => part.trim())
    .filter(isSectionKey);
}

const MAX_SECTION_CHARS = 20_000;
const VISIBILITIES: Visibility[] = ["public", "link", "private"];

export function sanitizeSections(input: unknown): Sections {
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

/** Render the exact markdown agents receive. Callers append the brand footer. */
export function renderProfileMarkdown(
  handle: string,
  sections: Sections,
  keys: SectionKey[],
): string {
  const parts: string[] = [`# ${handle}`];
  for (const key of SECTION_KEYS) {
    if (!keys.includes(key)) continue;
    const section = sections[key];
    if (!section?.content?.trim()) continue;
    parts.push(`## ${SECTION_LABELS[key]}\n\n${section.content.trim()}`);
  }
  if (parts.length === 1) {
    parts.push("_No sections are available at this scope._");
  }
  return parts.join("\n\n");
}
