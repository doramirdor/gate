// Gate brand tokens.
//
// `theme` = the LIGHT Apple-clean website palette (.theme-light in
// apps/web/app/globals.css) — the product's public face: the landing page and
// the onboarding funnel where a human creates their profile.
//
// `term` = the dark console palette, used only for the agent/runtime terminal
// windows, so the "machine" side reads distinct from the "human" side.
export const theme = {
  bg: "#ffffff",
  surface: "#ffffff",
  surface2: "#f5f5f7",
  ink: "#1d1d1f",
  inkMuted: "#6e6e73",
  line: "#e6e6eb",
  accent: "#f5a623",
  success: "#1a7f55",
  danger: "#c0362c",
  sans:
    'Inter, "Inter Variable", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  mono: 'JetBrains Mono, "JetBrains Mono Variable", ui-monospace, monospace',
} as const;

// Dark console palette for terminal windows (vivid, terminal-appropriate).
export const term = {
  bg: "#0c0c0e",
  surface: "#161618",
  surface2: "#1d1d21",
  line: "#26262b",
  ink: "#ededef",
  inkMuted: "#94949e",
  accent: "#ffb224",
  success: "#30d158",
  danger: "#ff453a",
  mono: 'JetBrains Mono, "JetBrains Mono Variable", ui-monospace, monospace',
} as const;

export const BRAND = {
  name: "Gate",
  domain: "usegate.dev",
  tagline: "AI acts within your limits. You approve what goes beyond.",
  footer: "context served by Gate · claim yours at usegate.dev",
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
