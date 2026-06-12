// AUTO-GENERATED - edit /lib/brand.ts and run `npm run sync`. Do not edit here.
/**
 * Single source of truth for ALL product naming and brand strings.
 *
 * Renaming the product or moving domains must be a one-file change.
 * Never hardcode the name, domain, tagline, or signature anywhere else -
 * import from here (web) or from supabase/functions/_shared/brand.ts
 * (edge functions), which is a generated mirror of this file.
 *
 * After editing, run `npm run sync` to refresh the edge-function mirror.
 */

export const BRAND_NAME = "Gate";

/** Candidate domains: usegate.dev | gatelink.dev | agentgate.io - flip here once confirmed. */
export const DOMAIN = "usegate.dev";

export const SITE_URL = `https://${DOMAIN}`;

export const TAGLINE = "AI acts within your limits. You approve what goes beyond.";

/** Public profile URL for a handle. */
export function profileUrl(handle: string): string {
  return `${SITE_URL}/${handle}`;
}

/** Template appended to outbound messages sent by a gated agent. */
export function signatureLine(handle: string, profile_url: string): string {
  return `Sent by ${handle}'s agent · gated via ${profile_url}`;
}

/** Footer appended to every MCP response served by the edge function. */
export const CONTEXT_FOOTER = `context served by ${BRAND_NAME} · claim yours at ${DOMAIN}`;
